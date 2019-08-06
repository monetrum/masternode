'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};
//----------------------------------------------------------------------------------------------------------------------
messages.badSing = 'İmza geçersiz';
messages.badPublicKey = 'Public key geçersiz';
messages.badPrivateKey = 'Private key geçersiz';
messages.balanceInsufficient = 'Bakiye yetersiz';
messages.assetBalanceInsufficient = 'Asset sahibinin MNT bakiyesi yetersiz';
messages.walletNotFound = 'Cüzdan adresi geçersiz';
messages.badWallet = 'Cüzdan adresi geçersiz';
messages.badFrom = 'Cüzdan adresi geçersiz';
messages.badTo = 'Gönderilecek cüzdan adresi geçersiz';
messages.toWalletNotFound = 'Gönderilecek cüzdan adresi geçersiz';
messages.badSignature = 'İmzanız geçersiz';
messages.badAmount = 'Amount sıfırdan farklı olmalıdır';
messages.badNonce = 'Zaman damgası formatı yanlış';
messages.badDesc = 'desc maximum 500 karakter olabilir';
messages.limitExceededData = 'data json formatında olmalıdır ve maximum 10 key olmalıdır';
messages.badHidden = 'hidden sadece true yada false olabilir';
messages.feeFromWalletNotFound = 'fee çekilecek cüzdan numarası geçersiz';
messages.badFeeAmount = 'Fee ücreti geçersiz';
messages.balanceInsufficient = 'Balance yetersiz';
messages.feeBalanceInsufficient = 'fee kesilecek cüzdanda balance yetersiz';
messages.badSupply = 'Supply 0 olamaz';
messages.badName = 'name minimum 3 maksimum 20 karater olabilir';
messages.badSymbol = 'symbol minimum 1 maksimum 6 karakter olabilir';
messages.badAsset = 'asset yanlış';
messages.assetExists = 'Bu asset zaten var';
messages.ownerIsNotExists = ' owner bulunamadı';
messages.invalidHash = 'hash doğru formatta değil';
messages.badHash = 'Hash geçersiz';
messages.assetAuthFailed = 'Asset yetki doğrulaması başarısız';
messages.badAccountId = 'account_id geçersiz';
messages.badContractName = 'name maksimum 50 karakter olabilir';
messages.badCode = 'code gereklidir ve maksimum 50000 karakter olabilir';
messages.badDesc = 'desc max 500 karakter olabilir';
messages.badDetail = 'detail max 50000 karakter olabilir';
messages.badImage = 'icon max 500000 byte olabilir ve doğru formatta olmalıdır';
messages.limitExceededForms = 'forms json yada array olmalıdır ve maksimum 50 key olabilir';
messages.checkInContractTx = 'Silmeye çalıştığınız akıllı sözleşme kullanılmış silinemez';
//----------------------------------------------------------------------------------------------------------------------
validators.send = joi.object({
    public_key: joi.string().optional().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    from: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badFrom)),
    to: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badTo)),
    asset: joi.string().required().min(2).max(6).error(new JoiError(messages.badAsset)),
    amount: joi.string().regex(/^([0-9]+\.[0-9]+|[0-9]+)$/i).required().error(new JoiError(messages.badAmount)),
    desc: joi.string().max(500).allow(null).error(new JoiError(messages.badDesc)),
    data: joi.object({}).allow(null).max(10).error(new JoiError(messages.limitExceededData)),
    forms: joi.alternatives([joi.object({}).max(50), joi.array().max(50)]).optional().allow(null).error(new JoiError(messages.limitExceededForms)),
});

validators.createAsset = joi.object({
    hash: joi.string().min(20).max(200).error(new JoiError(messages.badHash)),
    wallet: joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badWallet)),
    supply: joi.number().required().min(0.1).error(new JoiError(messages.badSupply)),
    name: joi.string().required().min(3).max(20).error(new JoiError(messages.badName)),
    symbol: joi.string().required().min(1).max(6).error(new JoiError(messages.badSymbol)),
    icon: joi.string().optional().allow(null).max(5000000).regex(/^data:image\/(png|jpg|jpeg);base64,/i).error(new JoiError(messages.badImage)),
});

validators.burnAsset = joi.object({
    public_key: joi.string().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    symbol: joi.string().required().min(1).max(6).error(new JoiError(messages.badSymbol)),
    amount: joi.number().required().min(0.1).error(new JoiError(messages.badAmount))
});

validators.create = joi.object({
    public_key: joi.string().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    name: joi.string().max(50).error(new JoiError(messages.badContractName)),
    code: joi.string().required().max(50000).error(new JoiError(messages.badCode)),
    desc: joi.string().optional().max(500).error(new JoiError(messages.badDesc)),
    detail: joi.string().optional().max(5000).error(new JoiError(messages.badDetail)),
    image: joi.string().optional().allow(null).max(5000000).regex(/^data:image\/(png|jpg|jpeg);base64,/i).error(new JoiError(messages.badImage)),
});

validators.update = joi.object({
    public_key: joi.string().max(1000).min(1).error(new JoiError(messages.badPublicKey)),
    name: joi.string().max(50).error(new JoiError(messages.badContractName)),
    code: joi.string().required().max(50000).error(new JoiError(messages.badCode))
});

validators.getContractByAddress = joi.string().required().regex(/^90x[A-Z0-9]{30,38}$/).error(new JoiError(messages.badWallet));


module.exports = {validators, messages};