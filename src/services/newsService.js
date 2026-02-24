const { fetchLatestNewsFromAnsa } = require('../bots/ansaBot');

const REQUEST_TIMEOUT_MS = 30000;

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('Timeout durante l\'accesso al sito sorgente.');
      error.statusCode = 504;
      error.code = 'UPSTREAM_TIMEOUT';
      reject(error);
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeError(error) {
  if (error.code === 'UPSTREAM_TIMEOUT') {
    error.statusCode = 504;
    return error;
  }

  if (error.code === 'UPSTREAM_PARSE_FAILED') {
    error.statusCode = 502;
    return error;
  }

  if (error.name === 'TimeoutError') {
    const timeoutError = new Error('Timeout durante l\'accesso al sito sorgente.');
    timeoutError.statusCode = 504;
    timeoutError.code = 'UPSTREAM_TIMEOUT';
    return timeoutError;
  }

  const internalError = new Error(error.message || 'Errore interno del server.');
  internalError.statusCode = error.statusCode || 500;
  internalError.code = error.code || 'INTERNAL_ERROR';
  return internalError;
}

async function getLatestNews({ limit, headless }) {
  try {
    const items = await withTimeout(
      fetchLatestNewsFromAnsa({ limit, headless }),
      REQUEST_TIMEOUT_MS
    );

    return {
      source: 'ansa',
      retrievedAt: new Date().toISOString(),
      count: items.length,
      items
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

module.exports = {
  getLatestNews
};
