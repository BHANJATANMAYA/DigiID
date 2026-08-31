'use strict';

const app = require('../backend/src/app');

module.exports = (req, res) => {
    return app(req, res);
};
