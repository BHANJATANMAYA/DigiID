module.exports = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'DigiID Verify — Serverless API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
};
