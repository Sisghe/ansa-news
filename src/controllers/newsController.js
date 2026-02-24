const { getLatestNews } = require('../services/newsService');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function parseLimit(rawLimit) {
  if (rawLimit === undefined) {
    return DEFAULT_LIMIT;
  }

  const limit = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    const error = new Error(`Il parametro limit deve essere un intero tra 1 e ${MAX_LIMIT}.`);
    error.statusCode = 400;
    error.code = 'INVALID_QUERY';
    throw error;
  }

  return limit;
}

function parseHeadless(rawHeadless) {
  if (rawHeadless === undefined) {
    return true;
  }

  if (rawHeadless === 'true') {
    return true;
  }

  if (rawHeadless === 'false') {
    return false;
  }

  const error = new Error('Il parametro headless deve essere true o false.');
  error.statusCode = 400;
  error.code = 'INVALID_QUERY';
  throw error;
}

async function healthCheck(req, res) {
  res.status(200).json({ status: 'ok' });
}

async function getNews(req, res, next) {
  const startedAt = Date.now();

  try {
    const limit = parseLimit(req.query.limit);
    const headless = parseHeadless(req.query.headless);

    console.log('[REQUEST] /news', { limit, headless });

    const payload = await getLatestNews({ limit, headless });

    console.log('[RESPONSE] /news success', {
      count: payload.count,
      elapsedMs: Date.now() - startedAt
    });

    res.status(200).json(payload);
  } catch (error) {
    console.log('[RESPONSE] /news failed', {
      elapsedMs: Date.now() - startedAt,
      code: error.code,
      message: error.message
    });
    next(error);
  }
}

module.exports = {
  healthCheck,
  getNews
};
