const { randomInt } = require('crypto');

const formatSentence = (text = '') => text.trim().replace(/\s+/g, ' ');

const createAIError = (statusCode, publicMessage, code) => {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  error.code = code;
  return error;
};

const normalizeExperiences = (experiences = []) => {
  const list = Array.isArray(experiences) ? experiences : [];
  return list.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
};

const buildPrompt = ({ businessName, locationName, rating, experiences, customerComment, language }, lineLimit) => `
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

const parseReviewText = (text, lineLimit) => {
  const reviewLines = text
    .split('\n')
    .map((line) => formatSentence(line.replace(/^(?:[-*]\s*|\d+[.)]\s*)/, '')))
    .filter(Boolean)
    .filter((line) => !/^(?:google review|review):?$/i.test(line))
    .slice(0, lineLimit);

  if (!reviewLines.length) {
    throw createAIError(502, 'AI provider returned an empty review. Please try again.', 'AI_EMPTY_RESPONSE');
  }

  return [reviewLines.join('\n')];
};

const handleProviderError = (status, provider) => {
  if (status === 401 || status === 403) {
    throw createAIError(503, `AI provider authentication failed. Check the ${provider} API key in Render.`, 'AI_KEY_REJECTED');
  }
  if (status === 429) {
    throw createAIError(503, `AI provider quota or rate limit reached. Check the ${provider} account limits.`, 'AI_RATE_LIMITED');
  }
  throw createAIError(502, `AI provider rejected the request. Check the configured model and ${provider} API access.`, 'AI_REQUEST_REJECTED');
};

const generateWithOpenAI = async (apiKey, model, prompt, lineLimit) => {
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You generate customer review suggestions based only on provided facts. Never invent details.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.75,
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw createAIError(503, 'Could not reach the AI provider. Please try again.', 'AI_PROVIDER_UNREACHABLE');
  }

  if (!response.ok) handleProviderError(response.status, 'OpenAI');

  const data = await response.json();
  return parseReviewText(data?.choices?.[0]?.message?.content || '', lineLimit);
};

const generateWithGemini = async (apiKey, model, prompt, lineLimit) => {
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Write grounded customer review drafts using only customer-provided facts. Never invent details.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw createAIError(503, 'Could not reach the AI provider. Please try again.', 'AI_PROVIDER_UNREACHABLE');
  }

  if (!response.ok) handleProviderError(response.status, 'Gemini');

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
  return parseReviewText(text, lineLimit);
};

const generateReviewSuggestions = async (payload) => {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw createAIError(503, 'AI review generation is not configured on the server. Add AI_API_KEY in Render.', 'AI_KEY_MISSING');
  }

  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const defaultModel = provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
  const model = process.env.AI_MODEL || defaultModel;
  const lineLimit = randomInt(5, 21);
  const prompt = buildPrompt(payload, lineLimit);

  if (provider === 'gemini') return generateWithGemini(apiKey, model, prompt, lineLimit);
  if (provider === 'openai') return generateWithOpenAI(apiKey, model, prompt, lineLimit);
  throw createAIError(500, 'AI_PROVIDER must be either "gemini" or "openai".', 'AI_PROVIDER_UNSUPPORTED');
};

module.exports = { generateReviewSuggestions };
