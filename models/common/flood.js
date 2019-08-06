'use strict';

const db = registry.get('db');
const moment = require('moment');

class Flood {
    static async check(type, user_id, minute = 1){
        let pipeline = { type, user_id, date: { $gte: moment().utc().subtract(minute, 'm').toDate() } };
        return !!(await db.collection('logs').findOne(pipeline));
    }
}

module.exports = Flood;