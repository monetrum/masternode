'use strict';
const db = registry.get('db');
const sha256 = require('sha256');
const moment = require('moment');
const client = registry.get('mongoClient');
const { ObjectID } = require('mongodb');
const {'verification-codes': verifyCodes} = registry.get('consts');
const { randomCode, tryFunc } = registry.get('helpers');
const pubsub = registry.get('pubsub');

class Auth {

    static async getAccountByEmail(email){
        return await db.collection('accounts').findOne({email});
    }

    static async getAccountById(id){
        return await db.collection('accounts').findOne({_id: ObjectID(id)});
    }

    static async getToken(token){
        return await db.collection('auth_tokens').findOne({ token });
    }

    static async getChangePaswordCodeByCode(code){
        return await db.collection('verification_codes').findOne({ type: verifyCodes['forgot-password'], code });
    }

    static async register(email, password){
        let isSha = /[0-9A-Fa-f]{20,64}/g.test(password);
        let data = {
            email,
            password: isSha ? password.trim() : sha256(password.trim()),
            status: 1,
            insert_date: moment().utc().toDate(),
            update_date: moment().utc().toDate(),
            name: '',
            surname: '',
            phone: {
                prefix: '90',
                number: ''
            },
            timezone: 3
        };

        let id = (await db.collection('accounts').insertOne(data)).insertedId;
        pubsub.publish('ACCOUNT_ADDED', {account: {_id: id, ...data}});
        return id;
    }

    static async addToken(account_id, token){
        let doc = {account_id, token, expiry_time: moment().utc().add(30, 'd').toDate()};
        let id = (await db.collection('auth_tokens').insertOne(doc)).insertedId;
        await pubsub.publish('TOKEN_ADDED', { token: {_id: id, ...doc}});
        return {_id: id, ...doc};
    }


    static async addForgotPasswordCode(account_id){
        try {
            let data = {
                type: verifyCodes['forgot-password'],
                account_id,
                code: randomCode(6,7),
                expiry_time: moment().utc().add(1, 'h').toDate()
            };

            await db.collection('verification_codes').insertOne(data);
            await pubsub.publish('VC_ADDED', { vc: data });
            return data;

        } catch (e) {
            if(e.name === 'MongoError' && e.code === 11000){
                return tryFunc(this, this.addForgotPasswordCode, account_id);
            }

            throw e;
        }
    }

    static async changePassword(code_id, account_id, password){
        let session = client.startSession();
        try {
            await session.startTransaction();
            await db.collection('verification_codes').deleteOne({ _id: code_id }, { session });
            let updated = await db.collection('accounts').findOneAndUpdate(
                {
                    _id: ObjectID(account_id)
                },
                {
                    $set: {
                        password: sha256(password.trim()),
                        update_date: moment().utc().toDate()
                    }
                },
                {
                    returnOriginal: false,
                    session
                }
            );
            await session.commitTransaction();
            session.endSession();
            if(updated.value){
                await pubsub.publish('ACCOUNT_ADDED', { account: updated.value });
            }

            return true;

        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            throw e;
        }
    }
}

module.exports = Auth;