'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};
//----------------------------------------------------------------------------------------------------------------------
messages.badSing = 'İmza geçersiz';
messages.badPublicKey = 'Public key geçersiz';
messages.badFromPublicKey = 'fee_from public keyi geçersiz';
messages.badPrivateKey = 'Private key geçersiz';
messages.balanceInsufficient = 'Bakiye yetersiz';
messages.walletNotFound = 'Cüzdan adresi geçersiz';
messages.badFrom = 'Cüzdan adresi geçersiz';
messages.badTo = 'Gönderilecek cüzdan adresi geçersiz';
messages.toWalletNotFound = 'Gönderilecek cüzdan adresi geçersiz';
messages.badSignature = 'İmzanız geçersiz';
messages.badAmount = 'Gönderilecek tutar float türünde olmalıdır';
messages.badNonce = 'Zaman damgası formatı yanlış';
messages.badDesc = 'desc maximum 500 karakter olabilir';
messages.limitExceededData = 'data json formatında olmalıdır ve maximum 10 key olmalıdır';
messages.limitExceededForms = 'forms json yada array formatında olmalıdır ve maximum 50 key olmalıdır';
messages.badHidden = 'hidden sadece true yada false olabilir';
messages.feeFromWalletNotFound = 'fee çekilecek cüzdan numarası geçersiz';
messages.badFeeAmount = 'Fee ücreti geçersiz';
messages.balanceInsufficient = 'Balance yetersiz';
messages.assetBalanceInsufficient = 'Asset sahibinin MNT bakiyesi yetersiz';
messages.feeBalanceInsufficient = 'fee kesilecek cüzdanda balance yetersiz';
messages.badAsset = 'asset yanlış';
messages.badSing = 'Hash doğru formatta değil';
messages.invalidPublicKey = 'Public key yanlış. Bu txin sahibi siz değilsiniz';
messages.anyWalletsNotFound = (wallet) => `${wallet} adresi bulunamadı`;
//----------------------------------------------------------------------------------------------------------------------
validators.send = joi.object({
    keys: joi.object({
        private_key: joi.string().max(500).min(1).error(new JoiError(messages.badPrivateKey)),
        public_key: joi.string().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
        sign: joi.string().max(1000).min(1).error(new JoiError(messages.badPrivateKey)),
    }).with('public_key', 'sign').without('private_key', ['public_key', 'sign']).or('public_key', 'private_key'),
    from: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badFrom)),
    to: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badTo)),
    amount: joi.string().regex(/^([0-9]+\.[0-9]+|[0-9]+)$/i).required().error(new JoiError(messages.badAmount)),
    asset: joi.string().required().min(2).max(6).error(new JoiError(messages.badAsset)),
    fee_from: joi.string().allow(null).max(1000).min(1).error(new JoiError(messages.badFromPublicKey)),
    nonce: joi.number().required().error(new JoiError(messages.badNonce)),
    desc: joi.string().allow(null).max(500).error(new JoiError(messages.badDesc)),
    data: joi.alternatives([joi.object({}).max(10), joi.array().max(10)]).error(new JoiError(messages.limitExceededData)),
    forms: joi.alternatives([joi.object({}).max(50), joi.array().max(50)]).optional().allow(null).error(new JoiError(messages.limitExceededForms)),
});

validators.deleteTxData = joi.object({
    public_key: joi.string().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    hash: joi.string().max(200).min(1).error(new JoiError(messages.badHash))
});

module.exports = {validators, messages};