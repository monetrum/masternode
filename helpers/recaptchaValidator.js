'use strict';

const request = require('request-promise-native');
const env = registry.get('env');

async function recaptchaValidator(code, remoteAddress){
    try {
        let response = await request.get('https://www.google.com/recaptcha/api/siteverify?secret=' + env.RECAPTCHA_SECRET + '&response=' + code + '&remoteip=' + remoteAddress);
        let body = JSON.parse(response);
        return !(body.success === undefined || body.success === false);
    } catch (e) {
        throw new Error('captha doğrulanamadı Server hatası = ' + e.message);
    }
}

module.exports = recaptchaValidator;