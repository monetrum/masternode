'use strict';

const messages = {};
const validators = {};
//----------------------------------------------------------------------------------------------------------------------
messages.serverError = 'Server Hatası';
messages.canNotSendEmail = 'Mail gönderilemedi';
messages.invalidToken = 'Token süreniz geçmiş yada geçersiz token';
messages.tokenPermissionDenied = 'Token Yetkinizin Bu işlemi yapmaya yetkisi yoktur';
messages.canNotGenerateSequence = 'Sequence üretilemedi';
messages.canNotSendSms = 'Sms gönderilemedi';
//----------------------------------------------------------------------------------------------------------------------

module.exports = {messages, validators};