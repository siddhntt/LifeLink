const { AppError, sendError } = require('../utils/helpers');

function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errorCode);
  }

  if (err.code === 'P2002') {
    return sendError(res, 'A record with this value already exists', 409, 'DUPLICATE');
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Record not found', 404, 'NOT_FOUND');
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return sendError(res, message, statusCode, 'INTERNAL_ERROR');
}

function notFoundHandler(req, res) {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
}

module.exports = { errorHandler, notFoundHandler };
