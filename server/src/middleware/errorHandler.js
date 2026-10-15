/**
 * Central Express Error Handler
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Express Central Error Handler:', err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred while processing your request.',
    timestamp: new Date().toISOString(),
  });
}

export default errorHandler;
