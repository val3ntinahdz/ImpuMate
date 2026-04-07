'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status  = err.status || 500;
  const message = err.message || 'Error interno del servidor.';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
