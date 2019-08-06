'use strict';

const JoiError = require(appDir + '/library/joiError');
const joi = require('@hapi/joi');
const messages = {};
const validators = {};

//----------------------------------------------------------------------------------------------------------------------
messages.badPort = 'yanlış port numarası';
messages.badOperatingSystem = 'operating system zorunludur';
messages.badNetworkSpeed = 'network speed zorunludur max 20 min 3 karakter olabilir';
messages.badCpu = 'cpu zorunludur max 20 min 3 karakter olabilir';
messages.badRam = 'ram zorunludur max 20 min 3 karakter olabilir';
messages.badHdd = 'hdd zorunludur max 20 min 3 karakter olabilir';
messages.badSSL = 'ssl sadece true yada false olabilir';
//----------------------------------------------------------------------------------------------------------------------
validators.add = joi.object({
    port: joi.number().integer().required().min(1).max(9999).error(new JoiError(messages.badPort)),
    operating_system: joi.string().required().max(100).min(3).error(new JoiError(messages.badOperatingSystem)),
    network_speed: joi.string().required().max(100).min(3).error(new JoiError(messages.badNetworkSpeed)),
    cpu: joi.string().required().max(100).min(3).error(new JoiError(messages.badCpu)),
    ram: joi.string().required().max(100).min(3).error(new JoiError(messages.badRam)),
    hdd: joi.string().required().max(100).min(3).error(new JoiError(messages.badHdd)),
    ssl: joi.boolean().required().error(new JoiError(messages.badSSL))
});
//----------------------------------------------------------------------------------------------------------------------

module.exports = {validators, messages};