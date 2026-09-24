export function errorHandler(err, req, res, next) {
  console.error('[NEXUS Error]', err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An internal academic server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
}

export default errorHandler;
