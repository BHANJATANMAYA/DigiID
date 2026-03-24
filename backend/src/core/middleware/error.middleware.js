/**
 * Global error handling middleware.
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
    console.error('🔥 Error:', err.stack || err.message);

    const statusCode = err.statusCode || 500;


    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}

/**
 * Middleware to handle 404 - Route Not Found.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        },
    });
}

module.exports = { errorHandler, notFoundHandler };
