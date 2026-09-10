class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function sendError(res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
  return res.status(statusCode).json({ success: false, message, errorCode });
}

module.exports = { AppError, asyncHandler, sendSuccess, sendError };
