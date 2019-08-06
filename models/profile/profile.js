'use strict';

const db = registry.get('db');
const sha256 = require('sha256');
const { ObjectID } = require('mongodb');
const client = registry.get('mongoClient');
const moment = require('moment');

class Profile {

    static async changePassword(user_id, password){
        let session = client.startSession();
        try {
            session.startTransaction();
            let isShaPassword = /[0-9A-Fa-f]{20,64}/g.test(password);
            await db.collection('accounts').updateOne(
                {
                    _id: ObjectID(user_id)
                },
                {
                    $set: {
                        password: isShaPassword ? password : sha256(password.trim()),
                        update_date: moment().utc().toDate()
                    }
                },
                {
                    session
                }
            );
            await session.commitTransaction();
            session.endSession();
            return true;
        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            throw e;
        }
    }
}

module.exports = Profile;