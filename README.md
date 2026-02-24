# Robottino ANSA News Service

Microservizio NodeJS (Express) con bot Playwright che estrae le ultime news da ANSA.

## Requisiti

- Node.js 18+
- npm

## Installazione

```bash
npm install
npx playwright install
```

## Avvio

```bash
npm start
```

Il server parte di default su `http://localhost:3000`.

## Endpoint

### `GET /health`

Risposta:

```json
{ "status": "ok" }
```

### `GET /news?limit=10&headless=true`

Parametri opzionali:

- `limit`: default `10`, massimo `20`
- `headless`: `true` (default) oppure `false`

Esempio risposta 200:

```json
{
  "source": "ansa",
  "retrievedAt": "2026-02-24T18:30:00.000Z",
  "count": 10,
  "items": [
    {
      "title": "Titolo news",
      "url": "https://www.ansa.it/...",
      "publishedAt": null,
      "category": null
    }
  ]
}
```

Errori previsti:

- `502`:

```json
{
  "error": "UPSTREAM_PARSE_FAILED",
  "message": "Impossibile estrarre le news dal sito sorgente."
}
```

- `504`:

```json
{
  "error": "UPSTREAM_TIMEOUT",
  "message": "Timeout durante l'accesso al sito sorgente."
}
```

## Esempi curl

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/news"
curl "http://localhost:3000/news?limit=5&headless=false"
```

## Struttura

```text
robottino-ansa-news/
  src/
    server.js
    routes/
      newsRoutes.js
    controllers/
      newsController.js
    services/
      newsService.js
    bots/
      ansaBot.js
  package.json
  .gitignore
  README.md
```
