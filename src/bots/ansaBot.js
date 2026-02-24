const { chromium } = require('playwright');

const ANSA_URL = 'https://www.ansa.it';

function buildError({ message, code, statusCode }) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function isPlaywrightTimeout(error) {
  return error && (error.name === 'TimeoutError' || /Timeout/i.test(error.message));
}

async function fetchLatestNewsFromAnsa({ limit = 10, headless = true }) {
  let browser;

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);

    await page.goto(ANSA_URL, {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForSelector('main, [role="main"], body', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const extracted = await page.evaluate((targetLimit) => {
      function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim();
      }

      function isLikelyNewsUrl(url) {
        if (!url || !/^https?:$/i.test(url.protocol)) {
          return false;
        }

        if (!url.hostname.includes('ansa.it')) {
          return false;
        }

        const path = url.pathname.toLowerCase();
        if (!path || path === '/' || path === '/#') {
          return false;
        }

        const blockedFragments = [
          '/sito/static/',
          'cookie',
          'privacy',
          'faq',
          'abbonamenti',
          'newsletter',
          'consent',
          'pubblicita',
          '/contatti'
        ];

        if (blockedFragments.some((fragment) => path.includes(fragment))) {
          return false;
        }

        return (
          path.includes('/sito/notizie/') ||
          /\/\d{4}\/\d{2}\/\d{2}\//.test(path) ||
          /\/canali\//.test(path) ||
          /\/mondo\//.test(path) ||
          /\/politica\//.test(path) ||
          /\/economia\//.test(path) ||
          /\/sport\//.test(path)
        );
      }

      function isLikelyNewsTitle(title) {
        if (!title || title.length < 20) {
          return false;
        }

        const lowered = title.toLowerCase();
        const blockedTerms = [
          'cookie',
          'privacy',
          'condizioni generali',
          'abbonamento',
          'acconsenti',
          'continua',
          'register@ansa.it'
        ];

        return !blockedTerms.some((term) => lowered.includes(term));
      }

      const root = document.querySelector('main') || document.body;
      const selectorGroups = [
        'article a[href]',
        '[class*="article"] a[href]',
        '[class*="news"] a[href]',
        '[class*="card"] a[href]',
        'h1 a[href], h2 a[href], h3 a[href]'
      ];

      let anchors = [];
      for (const selector of selectorGroups) {
        const matches = Array.from(root.querySelectorAll(selector));
        anchors.push(...matches);
      }

      if (anchors.length === 0) {
        anchors = Array.from(root.querySelectorAll('a[href]'));
      }

      const seen = new Set();
      const results = [];

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
          continue;
        }

        let url;
        try {
          url = new URL(href, window.location.origin);
        } catch {
          continue;
        }

        const absUrl = url.toString();
        if (seen.has(absUrl) || !isLikelyNewsUrl(url)) {
          continue;
        }

        const title = normalizeText(anchor.textContent);
        if (!isLikelyNewsTitle(title)) {
          continue;
        }

        const container = anchor.closest('article, li, div, section');

        let publishedAt = null;
        const timeNode = container && container.querySelector('time, [datetime]');
        if (timeNode) {
          const rawDate =
            timeNode.getAttribute('datetime') ||
            timeNode.getAttribute('content') ||
            timeNode.textContent ||
            '';
          const ts = Date.parse(rawDate);
          if (!Number.isNaN(ts)) {
            publishedAt = new Date(ts).toISOString();
          }
        }

        let category = null;
        const categoryNode =
          container &&
          container.querySelector('[class*="category"], [data-category], .tag, .kicker, .section');
        if (categoryNode) {
          const rawCategory = normalizeText(categoryNode.textContent);
          if (rawCategory) {
            category = rawCategory;
          }
        }

        seen.add(absUrl);
        results.push({
          title,
          url: absUrl,
          publishedAt,
          category
        });

        if (results.length >= targetLimit) {
          break;
        }
      }

      return results;
    }, limit);

    if (!extracted.length) {
      throw buildError({
        code: 'UPSTREAM_PARSE_FAILED',
        statusCode: 502,
        message: 'Impossibile estrarre le news dal sito sorgente.'
      });
    }

    return extracted.slice(0, limit);
  } catch (error) {
    if (error.code === 'UPSTREAM_PARSE_FAILED') {
      throw error;
    }

    if (isPlaywrightTimeout(error)) {
      throw buildError({
        code: 'UPSTREAM_TIMEOUT',
        statusCode: 504,
        message: 'Timeout durante l\'accesso al sito sorgente.'
      });
    }

    throw buildError({
      code: 'UPSTREAM_PARSE_FAILED',
      statusCode: 502,
      message: 'Impossibile estrarre le news dal sito sorgente.'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  fetchLatestNewsFromAnsa
};
