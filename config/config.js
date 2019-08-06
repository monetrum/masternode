'use strict';

const mode = process.env.NODE_ENV || 'development';

const config = {
    development: {},
    production: {}
};

module.exports = config[mode];