'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};
//----------------------------------------------------------------------------------------------------------------------
messages.badWallet = 'Cüzden adresi geçersiz';
messages.addressExists = 'Bu cüzdan zaten kayıtlı';
messages.smartContractExists = 'Bu smart contract başkasına kayıtlı';
messages.badPublicKey = 'Public key geçersiz';
messages.badPrivateKey = 'Private key geçersiz';
messages.badAccountId = 'account_id geçersiz';
messages.limitExceededWalletData = 'wallet_data max 10 property içerebilir';
messages.badAsset = 'Geçersiz Asset';
messages.badSign = 'Geçersiz imza';
//messages.getBalanceRequired = 'Account adresiniz geçersiz';
//----------------------------------------------------------------------------------------------------------------------


validators.getBalanceByWallet = joi.object({
    address: joi.string().required().regex(/^90x[A-Z0-9]{34,36}$/).error(new JoiError(messages.badWallet)),
    assets: joi.array().sparse().items(joi.string().max(6).min(1)).error(new JoiError(messages.badAsset))
});

validators.getBalanceByAccount = joi.array().sparse().items(joi.string().max(6).min(1)).error(new JoiError(messages.badAsset));


validators.generate = joi.object({}).max(10).error(new JoiError(messages.limitExceededWalletData));
validators.save = joi.object({
    public_key: joi.string().required().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    address: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badWallet)),
    wallet_data: joi.object({}).max(10).error(new JoiError(messages.limitExceededWalletData))
});

validators.update = joi.object({
    public_key: joi.string().max(500).min(1).required().error(new JoiError(messages.badPublicKey)),
    sign: joi.string().max(1000).min(1).required().error(new JoiError(messages.badSign)),
    wallet_data: joi.object({}).max(10).error(new JoiError(messages.limitExceededWalletData)),
});

validators.getWallet = joi.object({
    public_key: joi.string().max(500).min(1).required().error(new JoiError(messages.badPublicKey)),
    sign: joi.string().max(1000).min(1).required().error(new JoiError(messages.badSign))
});

validators.getWalletInfo = joi.string().max(500).min(1).error(new JoiError(messages.badPrivateKey));

module.exports = {validators, messages};