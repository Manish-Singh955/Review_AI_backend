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

const handleProviderError = (status, provider, model, providerError = {}) => {
  if (status === 401) {
    throw createAIError(503, `${provider} rejected the API key. Replace it with a valid ${provider} key in Render.`, 'AI_KEY_REJECTED');
  }
  if (status === 403) {
    throw createAIError(503, `${provider} denied access. Check the key's API restrictions and enable the ${provider} API for its project.`, 'AI_ACCESS_DENIED');
  }
  if (status === 400) {
    throw createAIError(502, `${provider} returned HTTP 400. Verify the API key is for ${provider}, the model "${model}" is supported, and the request is valid.`, 'AI_BAD_REQUEST');
  }
  if (status === 404) {
    throw createAIError(502, `${provider} could not find model "${model}". Set AI_MODEL to a model available to this API key.`, 'AI_MODEL_NOT_FOUND');
  }
  if (status === 429) {
    const providerDetails = [providerError.code, providerError.type, providerError.message]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (/insufficient_quota|billing|quota|credit|hard_limit/.test(providerDetails)) {
      throw createAIError(503, 'OpenAI reports that this API key has no available quota. Check billing, credits, and project spending limits in the OpenAI account.', 'AI_QUOTA_EXHAUSTED');
    }
    if (/rate[_ ]limit|too many requests|requests per|tokens per|retry after/.test(providerDetails)) {
      throw createAIError(503, 'OpenAI rate limit reached. Wait briefly and try again, or reduce concurrent review requests.', 'AI_RATE_LIMITED');
    }
    throw createAIError(503, 'OpenAI returned HTTP 429 without identifying the limit. Check billing, usage, and project limits first; if those are active, wait briefly and retry.', 'AI_429_UNCLASSIFIED');
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

  if (!response.ok) {
    let providerError = {};
    try {
      const body = await response.json();
      providerError = body?.error || {};
    } catch (error) {
      providerError = {};
    }
    handleProviderError(response.status, 'OpenAI', model, providerError);
  }

  const data = await response.json();
  return parseReviewText(data?.choices?.[0]?.message?.content || '', lineLimit);
};

const generateReviewSuggestions = async (payload) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw createAIError(503, 'AI review generation is not configured on the server. Add OPENAI_API_KEY in Render.', 'AI_KEY_MISSING');
  }

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const lineLimit = randomInt(5, 21);
  const prompt = buildPrompt(payload, lineLimit);

  return generateWithOpenAI(apiKey, model, prompt, lineLimit);
};

module.exports = { generateReviewSuggestions };
