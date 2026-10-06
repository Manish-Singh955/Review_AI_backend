const formatSentence = (text = '') => text.trim().replace(/\s+/g, ' ');

const normalizeExperiences = (experiences = []) => {
  const list = Array.isArray(experiences) ? experiences : [];
  return list.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
};

const buildLocalSuggestions = ({ businessName, rating, experiences, customerComment }) => {
  const normalizedExperiences = normalizeExperiences(experiences);
  const commentText = formatSentence(customerComment || '');
  const aspectLine = normalizedExperiences.length
    ? `The aspects I selected were ${normalizedExperiences.join(', ')}.`
    : 'No additional aspects were selected.';

  return [[
    `My review of ${businessName}.`,
    `My rating is ${rating} out of 5.`,
    `In my own words: ${commentText}`,
    aspectLine,
    'These are the details I chose to share.',
  ].join('\n')];
};

const generateWithOpenAI = async ({ businessName, locationName, rating, experiences, customerComment, language }) => {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey || process.env.AI_PROVIDER !== 'openai') {
    return buildLocalSuggestions({ businessName, locationName, rating, experiences, customerComment, language });
  }

  const prompt = `
    Write one natural, professional customer review in ${language || 'English'} using exactly 5 short lines.
    Use only the customer's rating, selected aspects, and comment as experience facts. The business name is provided context.
    Do not invent details, events, staff, products, service quality, recommendations, or future intentions.
    Keep the customer's meaning. If their comment is brief, do not pad it with unsupported claims.
    Business: ${businessName}
    Location: ${locationName}
    Rating: ${rating}
    Selected aspects: ${normalizeExperiences(experiences).join(', ') || 'none'}
    Customer's own words: ${customerComment}

    Return exactly 5 plain text lines, with no numbering or heading.
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
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error('AI provider request failed');
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';

  const reviewLines = text
    .split('\n')
    .map((line) => formatSentence(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '')))
    .filter(Boolean)
    .slice(0, 6);

  if (reviewLines.length >= 5) {
    return [reviewLines.join('\n')];
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
