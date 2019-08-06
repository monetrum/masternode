'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};

//----------------------------------------------------------------------------------------------------------------------
messages.badPassword = 'Şifreniz en az 4 en fazla 100 karakter olabilir';
messages.invalidOldPassword = 'Mevcut şifreniz yanlış';
//----------------------------------------------------------------------------------------------------------------------
validators.changePassword = joi.object({
    old_password: joi.string().required().min(4).max(100).error(new JoiError(messages.badPassword)),
    new_password: joi.string().required().min(4).max(100).error(new JoiError(messages.badPassword)),
});
//----------------------------------------------------------------------------------------------------------------------

module.exports = {validators, messages};