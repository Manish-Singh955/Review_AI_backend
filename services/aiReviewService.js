const formatSentence = (text = '') => text.trim().replace(/\s+/g, ' ');

const normalizeExperiences = (experiences = []) => {
  const list = Array.isArray(experiences) ? experiences : [];
  return list.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
};

const buildLocalSuggestions = ({ businessName, locationName, rating, experiences, customerComment, language }) => {
  const normalizedExperiences = normalizeExperiences(experiences);
  const commentText = formatSentence(customerComment || '');
  const experienceText = normalizedExperiences.join(', ');
  const details = [commentText, experienceText ? `Selected aspects: ${experienceText}.` : ''].filter(Boolean).join(' ');

  return [
    `At ${businessName}, I rated my experience ${rating} out of 5. ${details}`,
    `My experience at ${businessName}: ${details} Rating: ${rating} out of 5.`,
    `I visited ${businessName}. ${details} My rating was ${rating} out of 5.`,
  ]
    .map((item) => formatSentence(item))
    .filter(Boolean);
};

const generateWithOpenAI = async ({ businessName, locationName, rating, experiences, customerComment, language }) => {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey || process.env.AI_PROVIDER !== 'openai') {
    return buildLocalSuggestions({ businessName, locationName, rating, experiences, customerComment, language });
  }

  const prompt = `
    Create exactly 3 short customer review suggestions in ${language || 'English'}.
    Use only the customer information provided.
    Do not invent facts, products, staff names, or events.
    Business: ${businessName}
    Location: ${locationName}
    Rating: ${rating}
    Experiences: ${normalizeExperiences(experiences).join(', ') || 'general experience'}
    Customer comment: ${customerComment || 'No extra comment provided'}

    Return as plain text lines, each on a separate line, with no numbering.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You generate customer review suggestions based only on provided facts. Never invent details.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('AI provider request failed');
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';

  const suggestions = text
    .split('\n')
    .map((line) => formatSentence(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '')))
    .filter(Boolean)
    .slice(0, 3);

  if (suggestions.length) {
    return suggestions;
  }

  return buildLocalSuggestions({ businessName, locationName, rating, experiences, customerComment, language });
};

const generateReviewSuggestions = async (payload) => {
  try {
    return await generateWithOpenAI(payload);
  } catch (error) {
    return buildLocalSuggestions(payload);
  }
};

module.exports = {
  generateReviewSuggestions,
  buildLocalSuggestions,
};
