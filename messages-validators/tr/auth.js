'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};
//----------------------------------------------------------------------------------------------------------------------
messages.badEmail = 'Email adresiniz geçersiz';
messages.badPassword = 'Şifreniz en az 4 en fazla 32 karakter olabilir';
messages.emailAlreadyExists = 'E-posta adresi zaten kayıtlı';
messages.accountNotFound = 'Bu eposta adresi ile üye bulunamadı';
messages.invalidPassword = 'Şifreniz yanlış';
messages.canNotCreateToken = 'Token oluşturulamadı tekrar deneyiniz';
messages.forgotPasswordEmailTitle = 'Şifre Hatırlatma';
messages.badVerificationCode = 'Doğrulama kodunuz geçersiz';
messages.newPasswordEmailTitle = 'Yeni Şifreniz';
//----------------------------------------------------------------------------------------------------------------------
validators.register = joi.object({
    email: joi.string().required().email().error(new JoiError(messages.badEmail)),
    password: joi.string().required().min(4).max(64).error(new JoiError(messages.badPassword)),
});

validators.login = joi.object({
    email: joi.string().required().email().error(new JoiError(messages.badEmail)),
    password: joi.string().required().min(4).max(64).error(new JoiError(messages.badPassword)),
});

validators.forgotPassword = joi.string().required().email().error(new JoiError(messages.badEmail));
validators.sendNewPassword = joi.string().max(128).min(1).required().error(new JoiError(messages.badVerificationCode));

module.exports = {validators, messages};