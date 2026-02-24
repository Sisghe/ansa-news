const express = require('express');
const newsRoutes = require('./routes/newsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/', newsRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint non trovato.'
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Errore interno del server.';

  console.error('[ERROR]', {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message,
    stack: err.stack
  });

  res.status(statusCode).json({
    error: errorCode,
    message
  });
});

app.listen(PORT, () => {
  console.log(`[BOOT] Robottino ANSA News in ascolto su porta ${PORT}`);
});
