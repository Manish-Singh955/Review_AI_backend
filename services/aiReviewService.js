const { randomInt } = require('crypto');

const formatSentence = (text = '') => text.trim().replace(/\s+/g, ' ');

const normalizeExperiences = (experiences = []) => {
  const list = Array.isArray(experiences) ? experiences : [];
  return list.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
};

const generateWithOpenAI = async ({ businessName, locationName, rating, experiences, customerComment, language }) => {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error('AI review generation is not configured');
  }

  const lineLimit = randomInt(5, 21);

  const prompt = `
    Write one natural, professional, first-person Google review draft in ${language || 'English'}.
    The maximum is ${lineLimit} short lines. Choose a natural length based on how much detail the customer provided; never add filler to reach the limit.
    Use only the customer's rating, selected aspects, and comment as experience facts. The business name is provided context.
    The selected aspects were chosen under a question asking what the customer liked, so they may be described as appreciated.
    Do not invent details, events, staff, products, service quality, recommendations, or future intentions.
    Keep the customer's meaning. If their comment is brief or empty, do not pad it with unsupported claims.
    Keep the tone professional and genuine, not promotional or exaggerated.
    Business: ${businessName}
    Location: ${locationName}
    Rating: ${rating}
    Selected aspects: ${normalizeExperiences(experiences).join(', ') || 'none'}
    Customer's own words: ${customerComment || '(none provided)'}

    Return only the review text, with no numbering, heading, quotation marks, or markdown.
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
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    throw new Error('AI provider request failed');
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';

  const reviewLines = text
    .split('\n')
    .map((line) => formatSentence(line.replace(/^(?:[-*]\s*|\d+[.)]\s*)/, '')))
    .filter(Boolean)
    .filter((line) => !/^(?:google review|review):?$/i.test(line))
    .slice(0, lineLimit);

  if (!reviewLines.length) {
    throw new Error('AI provider returned an empty review');
  }

  return [reviewLines.join('\n')];
};

const generateReviewSuggestions = async (payload) => generateWithOpenAI(payload);

module.exports = { generateReviewSuggestions };
