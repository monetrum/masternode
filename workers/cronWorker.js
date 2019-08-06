'use strict';
// const env = registry.get('env');
const db = registry.get('db');
const { Long } = require('mongodb');
const moment = require('moment');
const { 'tx-situations': txSituations } = registry.get('consts');
const request = require('request-promise-native');
const { stc } = registry.get('helpers');

async function cronWorker() {
    //----------------------------------------------------------------------------------------------------------
    await db.collection('auth_tokens').deleteMany({ expiry_time: { $lt: moment().utc().toDate() } });
    await db.collection('verification_codes').deleteMany({ expiry_time: { $lt: moment().utc().toDate() } });

    //----------------------------------------------------------------------------------------------------------
    let findTx = {
        type: -2,
        action_time: {
            $lt: Long.fromNumber(moment().utc().subtract(1, 'h').toDate().getTime())
        }
    };

    let updateTx = {
        $set: {
            type: 0,
            status: txSituations['smart-contract-did-not-allow']
        }
    };

    await db.collection('tx').updateMany(findTx, updateTx);
    //----------------------------------------------------------------------------------------------------------
    let lastId;
    let findNode = {
        accessible_service: true
    };

    while(true){
        if(lastId) findNode._id = { $gt: lastId };

        let nodes = await db.collection('nodes').find(findNode).limit(1000).sort({ _id: 1}).toArray();
        if(nodes.length === 0) break;
        lastId = nodes[ nodes.length -1 ]._id;

        for(let node of nodes){
            let test = await stc(async () => JSON.parse(await request.get(node.ssl === true ? 'https:': 'http:' + `//${node.ip}:${node.port}/test`, { timeout: 2000 })));
            if(test instanceof Error){
                console.log(node.ip, node.port, 'erişilemez olarak güncellendi');
                await db.collection('nodes').updateOne({ _id: node._id }, { $set: { accessible_service: false }});
            }
        }
    }

    return true;
}

module.exports = cronWorker;