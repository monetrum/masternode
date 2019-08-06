'use strict';
const db = registry.get('db');
const { ObjectID } = require('mongodb');
const moment = require('moment');

class Context {

    static async getUser(token){
        let authToken = await db.collection('auth_tokens').findOne({ token, expiry_time: { $gte: moment().utc().toDate() } });
        if(!authToken){
            return undefined;
        }

        let user = await db.collection('accounts').findOne({ _id: ObjectID(authToken.account_id) });
        return { token: authToken, user };
    }
}

module.exports = Context;