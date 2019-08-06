'use strict';
const db = registry.get('db');
const pubsub = registry.get('pubsub');
const { ObjectID, Long } = require('mongodb');
const env = registry.get('env');
const client = registry.get('mongoClient');
const { blockchain: { createHash }, sleep } = registry.get('helpers');
const { fee } = registry.get('consts');
const _ = require('lodash');
const moment = require('moment');

class Queue {

    static async getWalletByAddress(address){
        return await db.collection('wallets').findOne({ address });
    }

    static async getAssetBySymbol(symbol){
        return await db.collection('assets').findOne({ symbol });
    }

    // static async getAssetByAddress(address){
    //     return await db.collection('assets').findOne({ genesis_wallet: address });
    // }

    static async getContractById(_id){
        return await db.collection('contracts').findOne({ _id: ObjectID(_id) });
    }

    static async *asyncTxIterator(worker_id){
        let find = {
            worker_id: parseInt(worker_id),
            type: -1
        };

        while(true){
            let txes = await db.collection('tx').find(find).sort({ seq: 1 }).limit(100).toArray();
            if(txes.length === 0){
                await sleep(3000);
                continue;
            }

            find.seq = { $gt: txes[txes.length - 1 ].seq };
            for(let tx of txes){
                yield tx;
            }
        }
    }

    static async set(_id, object){
        let find = {
            _id: ObjectID(_id)
        };

        let set = { $set: object };

        let options = {
            returnOriginal: false
        };

        let updated = await db.collection('tx').findOneAndUpdate(find, set, options);
        if(updated.value){
            await pubsub.publish('TX_ADDED', { tx: [ updated.value ] });
            return updated.value;
        }

        return undefined;
    }

    static async getBalanceByAddressAndAsset(address, asset) {
        let balanceAgg = [
            {
                $match: {
                    type: {
                        $in: [-2, 1, 2, 3, 4]
                    },
                    from: address,
                    asset: asset.toUpperCase()
                }
            },
            {
                $group: {
                    _id: 1,
                    balance: {
                        $sum: '$amount'
                    }
                }
            }
        ];

        let balance = (await db.collection('tx').aggregate(balanceAgg).toArray()).shift();
        return (balance !== undefined ? balance.balance : 0.00);
    }

    static async handle(document){
        let session = client.startSession();
        while (true){
            try {
                await session.startTransaction();
                let doc = _.cloneDeep(document);
                let tx = {};
                let docs = [];
                let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
                let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
                let asset = await this.getAssetBySymbol(doc.asset);

                if(lastTx){
                    lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
                }

                let types = document.fee === 0 ? [ 2 ] : [2, 3, 4 ];
                for(let type of types){
                    switch (type) {
                        case 2:
                            tx = _.cloneDeep({
                                type,
                                from: doc.to,
                                to: doc.from,
                                fee_from: doc.fee_from,
                                amount: Math.abs(doc.amount),
                                asset: doc.asset,
                                desc: doc.desc,
                                fee: Math.abs(doc.fee),
                                fee_asset: doc.fee_asset,
                                nonce: doc.nonce,
                                confirm_rate: doc.confirm_rate || 0,
                                action_time: Long.fromNumber(doc.action_time),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                forms: doc.forms,
                                seq: lsh.seq + 1 ,
                                prev_hash: lsh.hash,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: doc.to,
                                    to: doc.from,
                                    amount: Math.abs(doc.amount),
                                    asset: doc.asset,
                                    nonce: doc.nonce
                                })
                            });
                            break;

                        case 3:
                            tx = _.cloneDeep({
                                type,
                                from: doc.fee_from,
                                to: asset.genesis_wallet,
                                fee_from: doc.fee_from,
                                amount: 0 - Math.abs(doc.fee),
                                asset: doc.asset,
                                desc: doc.desc,
                                fee: 0,
                                fee_asset: doc.fee_asset,
                                nonce: doc.nonce,
                                confirm_rate: doc.confirm_rate || 0,
                                action_time: Long.fromNumber(doc.action_time),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                forms: doc.forms,
                                seq: lsh.seq + 1 ,
                                prev_hash: lsh.hash ,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: doc.fee_from,
                                    to: asset.genesis_wallet,
                                    amount: 0 - Math.abs(doc.fee),
                                    asset: doc.asset,
                                    nonce: doc.nonce
                                })
                            });
                            break;

                        case 4:
                            tx = _.cloneDeep({
                                type,
                                from: asset.genesis_wallet,
                                to: doc.fee_from,
                                fee_from: doc.fee_from,
                                amount: Math.abs(doc.fee),
                                asset: doc.asset,
                                desc: doc.desc,
                                fee: 0,
                                fee_asset: doc.fee_asset,
                                nonce: doc.nonce,
                                confirm_rate: doc.confirm_rate || 0,
                                action_time: Long.fromNumber(doc.action_time),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                forms: doc.forms,
                                seq: lsh.seq + 1 ,
                                prev_hash: lsh.hash ,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: asset.genesis_wallet,
                                    to: doc.fee_from,
                                    amount: Math.abs(doc.fee),
                                    asset: doc.asset,
                                    nonce: doc.nonce
                                })
                            });
                            break;
                    }

                    let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
                    docs.push(_.cloneDeep({ _id: id, ...tx }));
                    lsh = _.cloneDeep({ seq: tx.seq, hash: tx.hash });
                }

                let feetypes = document.fee === 0 ? [] : [ 3, 4 ];
                for(let type of feetypes){
                    switch (type) {
                        case 3:
                            tx = _.cloneDeep({
                                type,
                                from: asset.genesis_wallet,
                                to: env.FEE_WALLET,
                                fee_from: asset.genesis_wallet,
                                amount: 0 - Math.abs(fee.mnt),
                                asset: 'MNT',
                                desc: doc.desc,
                                fee: 0,
                                fee_asset: 'MNT',
                                nonce: doc.nonce,
                                confirm_rate: doc.confirm_rate || 0,
                                action_time: Long.fromNumber(doc.action_time),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                forms: doc.forms,
                                seq: lsh.seq + 1 ,
                                prev_hash: lsh.hash,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: asset.genesis_wallet,
                                    to: env.FEE_WALLET,
                                    amount: 0 - Math.abs(fee.mnt),
                                    asset: 'MNT',
                                    nonce: doc.nonce
                                })
                            });
                            break;

                        case 4:
                            tx = _.cloneDeep({
                                type,
                                from: env.FEE_WALLET,
                                to: asset.genesis_wallet,
                                fee_from: env.FEE_WALLET,
                                amount: Math.abs(fee.mnt),
                                asset: 'MNT',
                                desc: doc.desc,
                                fee: 0,
                                fee_asset: 'MNT',
                                nonce: doc.nonce,
                                confirm_rate: doc.confirm_rate || 0,
                                action_time: Long.fromNumber(doc.action_time),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                forms: doc.forms,
                                seq: lsh.seq + 1 ,
                                prev_hash: lsh.hash,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: env.FEE_WALLET,
                                    to: asset.genesis_wallet,
                                    amount: Math.abs(fee.mnt),
                                    asset: 'MNT',
                                    nonce: doc.nonce
                                })
                            });
                            break;
                    }

                    let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
                    docs.push(_.cloneDeep({ _id: id, ...tx }));
                    lsh = _.cloneDeep({ seq: tx.seq, hash: tx.hash });
                }

                let find = {
                    _id: document._id
                };

                let set = {
                    $set: {
                        type: 1,
                        complete_time: Long.fromNumber(moment().utc().toDate().getTime())
                    }
                };

                let options = {
                    returnOriginal: false
                };

                let updated = await db.collection('tx').findOneAndUpdate(find, set, options);
                docs.push(_.cloneDeep(updated.value));
                await session.commitTransaction();
                session.endSession();
                await pubsub.publish('TX_ADDED', { tx: docs });
                return true;
            } catch (e) {
                if (e.errorLabels && e.errorLabels.indexOf('TransientTransactionError') !== -1) {
                    console.log('TransientTransactionError, retrying transaction ...');
                    await session.abortTransaction();
                    continue;
                }

                await session.abortTransaction();
                session.endSession();
                throw e;
            }
        }
    }
}

module.exports = Queue;