'use strict';

const db = registry.get('db');

class sequences {

    static async currentVal(type){
        let find = { type };
        let update = { $inc: { val: 1 } };
        let options = { upsert: true };
        let result = await db.collection('sequences').findOneAndUpdate(find, update, options);

        if(!result.value){
            return undefined;
        }

        return result.value;
    }

    static async setData(type, data){
        return await db.collection('sequences').updateOne({ type }, { $set: { data }});
    }
}

module.exports = sequences;