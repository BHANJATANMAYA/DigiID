/**
 * requireAuth middleware
 * Checks for a valid Authorization: Bearer <token> header.
 * Token must match AUTH_TOKEN env var (defaults to 'digiid-secret').
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const expectedToken = process.env.AUTH_TOKEN || 'digiid-secret';

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.slice(7); // Remove "Bearer "
    if (token !== expectedToken) {
        return res.status(401).json({ success: false, error: 'Invalid authorization token' });
    }

    next();
}

module.exports = requireAuth;
