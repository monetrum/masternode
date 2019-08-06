'use strict';
const crypto = require('crypto');

class CryptoMon {
    constructor(secret){
        if (!secret || typeof secret !== 'string') {
            throw new Error('Cryptr: secret must be a non-0-length string');
        }

        this.secret = secret;
        this.key = crypto.createHash('sha256').update(String(secret)).digest();
    }

    getSecret(){
        return this.secret;
    }

    encrypt(value){
        if (value == null) {
            throw new Error('value must not be null or undefined');
        }

        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-ctr', this.key, iv);
        let encrypted = cipher.update(String(value), 'utf8', 'hex') + cipher.final('hex');
        return iv.toString('hex') + encrypted;

    }

    decrypt(value){
        if (value == null) {
            throw new Error('value must not be null or undefined');
        }

        let stringValue = String(value);
        let iv = Buffer.from(stringValue.slice(0, 32), 'hex');
        let encrypted = stringValue.slice(32);
        let decipher = crypto.createDecipheriv('aes-256-ctr', this.key, iv);
        return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    }

}

module.exports = CryptoMon;