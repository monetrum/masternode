'use strict';
const { filtererAndSorter: { filtererAndSorter, generateCursorString}, tryFunc, blockchain } = registry.get('helpers');
const { createHash } = blockchain;
const db = registry.get('db');
const { ObjectID } = require('mongodb');
const client = registry.get('mongoClient');
const pubsub = registry.get('pubsub');
const _ = require('lodash');
const { fee } = registry.get('consts');

class Tx {

    static async getWalletByAddress(address){
        return await db.collection('wallets').findOne({address});
    }

    static async getAssetBySymbol(symbol){
        return await db.collection('assets').findOne({ symbol });
    }

    static async getAssetByAddress(address){
        return await db.collection('assets').findOne({ genesis_wallet: address });
    }

    static async getTxByHash(hash){
        return await db.collection('tx').findOne({ hash });
    }

    static async lastSeq(){
        let lastTx = (await db.collection('tx').find({}, {seq: 1}).sort({seq: -1}).limit(1).toArray()).shift();
        return lastTx ? lastTx.seq : 0;
    }

    static async getContractById(_id){
        return await db.collection('contracts').findOne({ _id: ObjectID(_id) });
    }

    static async setTxType(_id, type){
        let updatedTx = await db.collection('tx').findOneAndUpdate({_id: ObjectID(_id)}, { $set: { type } }, {returnOriginal: false });
        if(updatedTx.value){
            await pubsub.publish('TX_ADDED', { tx: [ updatedTx.value ] });
            return updatedTx.value;
        }

        return undefined;
    }

    static async getBalanceByAddressAndAsset(address, asset) {
        let balanceAgg = [
            {
                $match: {
                    type: {
                        $in: [ -2, 1, 2, 3, 4 ]
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


    static async getTxList(account_id, filters, sorting, cursor, limit, fields){
        let myTxQuery = {};
        if('my_tx' in filters && account_id){
            if(filters.my_tx === true && account_id){
                myTxQuery = { 'wallets.account_id': account_id }
            }

            delete filters.my_tx;
            delete filters.account_id;
        }

        let castRules = [
            { column: '_id', cast: x => ObjectID(x) },
            { column: 'seq', cast: x => parseInt(x) }
        ];

        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filters, sorting, cursor, { filter: { }, sort:{ } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];
        let count = 0;
        let transactions = [];

        if(!limit || limit > 1000){
            limit = 1000;
        }

        if('wallets.account_id' in myTxQuery){
            //----------------------------------------------------------------------------------------------------------
            let countMatch = countAnd.length > 0 ? { $match: { $and: countAnd } } : { $match: { } };
            let countAgg = [
                countMatch,
                {
                    $lookup: {
                        from: 'wallets',
                        localField: 'from',
                        foreignField: 'address',
                        as: 'wallets'
                    }
                },
                {
                    $unwind: '$wallets'
                },
                {
                    $match: {
                        $and: [ myTxQuery ]
                    }
                },
                {
                    $count: 'count'
                }
            ];

            //----------------------------------------------------------------------------------------------------------

            let listMatch = listAnd.length > 0 ? { $match: { $and: listAnd } } : { $match: { } };
            let listAgg = [
                listMatch,
                {
                    $lookup: {
                        from: 'wallets',
                        localField: 'from',
                        foreignField: 'address',
                        as: 'wallets'
                    }
                },
                {
                    $unwind: '$wallets'
                },
                {
                    $match: {
                        $and: [ myTxQuery ]
                    }
                },
                {
                    $sort: sort
                },
                {
                    $limit: limit
                }
            ];

            //----------------------------------------------------------------------------------------------------------

            if('count' in fields){
                let firstItem = (await db.collection('tx').aggregate(countAgg).toArray()).shift();
                count = firsItem ? firstItem.count : 0 ;
            }

            if('transactions' in fields){
                transactions = await db.collection('tx').aggregate(listAgg).toArray();
            }

        } else {
            if('count' in fields){
                count = await db.collection('tx').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
            }

            if('transactions' in fields){
                transactions = await db.collection('tx').find(listAnd.length > 0 ? { $and: listAnd } : { }).sort(sort).limit(limit).toArray();
            }
        }

        let next_cursor = null;
        let lastRow = { };
        if(transactions.length > 0){
            lastRow = transactions[transactions.length - 1];
            next_cursor = generateCursorString({ seq: lastRow.seq, _id: lastRow._id.toString() });
        }

        return {
            transactions,
            count,
            next_cursor
        }
    }

    static async getTx(filters){
        let find = {};
        if(filters.hash){
            find.hash = filters.hash;
        }

        if(filters.seq){
            find.seq = parseInt(filters.seq);
        }

        if(Object.keys(find).length === 0){
            return null;
        }

        return await db.collection('tx').findOne(find);
    }


    static async addTx(document){
        let session = client.startSession();
        while(true){
            try {
                await session.startTransaction();
                let doc = _.cloneDeep(document);
                let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
                let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
                if(lastTx){
                    lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
                }

                doc.seq = lsh.seq + 1;
                doc.prev_hash = lsh.hash;
                doc.hash = createHash({
                    prevHash: lsh.hash,
                    from: doc.from,
                    to: doc.to,
                    amount: 0 - Math.abs(doc.amount),
                    asset: doc.asset,
                    nonce: doc.nonce
                });

                let id = (await db.collection('tx').insertOne(doc, { session })).insertedId;

                await session.commitTransaction();
                session.endSession();
                await pubsub.publish('TX_ADDED', { tx: [ { _id: id, ...doc } ] });
                return { _id: id, ...doc };

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

    // static async handleTx( document ){
    //     let session = client.startSession();
    //     while (true){
    //         try {
    //             await session.startTransaction();
    //             let doc = _.cloneDeep(document);
    //             let tx = {};
    //             let docs = [];
    //             let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
    //             let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
    //             let asset = await this.getAssetBySymbol(doc.asset);
    //
    //             if(lastTx){
    //                 lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
    //             }
    //
    //             for(let type of [ 1, 2, 3, 4 ]){
    //                 switch (type) {
    //                     case 1:
    //                         tx = _.cloneDeep({
    //                             type,
    //                             from: doc.from,
    //                             to: doc.to,
    //                             fee_from: doc.fee_from,
    //                             data: doc.data,
    //                             amount: 0 - Math.abs(doc.amount),
    //                             sign: doc.sign,
    //                             asset: doc.asset,
    //                             desc: doc.desc,
    //                             fee: 0 - Math.abs(doc.fee),
    //                             fee_asset: doc.fee_asset,
    //                             nonce: doc.nonce,
    //                             confirm_rate: doc.confirm_rate || 0,
    //                             action_time: doc.action_time,
    //                             complete_time: doc.complete_time,
    //                             forms: doc.forms,
    //                             seq: lsh.seq + 1 ,
    //                             prev_hash: lsh.hash ,
    //                             hash: createHash({
    //                                 prevHash: lsh.hash,
    //                                 from: doc.from,
    //                                 to: doc.to,
    //                                 amount: 0 - Math.abs(doc.amount),
    //                                 asset: doc.asset,
    //                                 nonce: doc.nonce
    //                             })
    //                         });
    //                         break;
    //
    //                     case 2:
    //                         tx = _.cloneDeep({
    //                             type,
    //                             from: doc.to,
    //                             to: doc.from,
    //                             fee_from: doc.fee_from,
    //                             amount: Math.abs(doc.amount),
    //                             sign: doc.sign,
    //                             asset: doc.asset,
    //                             desc: doc.desc,
    //                             fee: Math.abs(doc.fee),
    //                             fee_asset: doc.fee_asset,
    //                             nonce: doc.nonce,
    //                             confirm_rate: doc.confirm_rate || 0,
    //                             action_time: doc.action_time,
    //                             complete_time: doc.complete_time,
    //                             forms: doc.forms,
    //                             seq: lsh.seq + 1 ,
    //                             prev_hash: lsh.hash,
    //                             hash: createHash({
    //                                 prevHash: lsh.hash,
    //                                 from: doc.to,
    //                                 to: doc.from,
    //                                 amount: Math.abs(doc.amount),
    //                                 asset: doc.asset,
    //                                 nonce: doc.nonce
    //                             })
    //                         });
    //                         break;
    //
    //                     case 3:
    //                         tx = _.cloneDeep({
    //                             type,
    //                             from: doc.fee_from,
    //                             to: asset.genesis_wallet,
    //                             fee_from: doc.fee_from,
    //                             amount: 0 - Math.abs(doc.fee),
    //                             sign: doc.sign,
    //                             asset: doc.asset,
    //                             desc: doc.desc,
    //                             fee: 0,
    //                             fee_asset: doc.fee_asset,
    //                             nonce: doc.nonce,
    //                             confirm_rate: doc.confirm_rate || 0,
    //                             action_time: doc.action_time,
    //                             complete_time: doc.complete_time,
    //                             forms: doc.forms,
    //                             seq: lsh.seq + 1 ,
    //                             prev_hash: lsh.hash ,
    //                             hash: createHash({
    //                                 prevHash: lsh.hash,
    //                                 from: doc.fee_from,
    //                                 to: asset.genesis_wallet,
    //                                 amount: 0 - Math.abs(doc.fee),
    //                                 asset: doc.asset,
    //                                 nonce: doc.nonce
    //                             })
    //                         });
    //                         break;
    //
    //                     case 4:
    //                         tx = _.cloneDeep({
    //                             type,
    //                             from: asset.genesis_wallet,
    //                             to: doc.fee_from,
    //                             fee_from: doc.fee_from,
    //                             amount: Math.abs(doc.fee),
    //                             sign: doc.sign,
    //                             asset: doc.asset,
    //                             desc: doc.desc,
    //                             fee: 0,
    //                             fee_asset: doc.fee_asset,
    //                             nonce: doc.nonce,
    //                             confirm_rate: doc.confirm_rate || 0,
    //                             action_time: doc.action_time,
    //                             complete_time: doc.complete_time,
    //                             forms: doc.forms,
    //                             seq: lsh.seq + 1 ,
    //                             prev_hash: lsh.hash ,
    //                             hash: createHash({
    //                                 prevHash: lsh.hash,
    //                                 from: asset.genesis_wallet,
    //                                 to: doc.fee_from,
    //                                 amount: Math.abs(doc.fee),
    //                                 asset: doc.asset,
    //                                 nonce: doc.nonce
    //                             })
    //                         });
    //                         break;
    //                 }
    //
    //                 let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
    //                 docs.push(_.cloneDeep({ _id: id, ...tx }));
    //                 lsh = _.cloneDeep({ seq: tx.seq, hash: tx.hash });
    //             }
    //
    //             if(document.fee !== 0){
    //                 for(let type of [ 3, 4 ]){
    //                     switch (type) {
    //                         case 3:
    //                             tx = _.cloneDeep({
    //                                 type,
    //                                 from: asset.genesis_wallet,
    //                                 to: env.MINERS_WALLET_ADDRESS,
    //                                 fee_from: asset.genesis_wallet,
    //                                 amount: 0 - Math.abs(fee.mnt),
    //                                 sign: doc.sign,
    //                                 asset: 'MNT',
    //                                 desc: doc.desc,
    //                                 fee: 0,
    //                                 fee_asset: 'MNT',
    //                                 nonce: doc.nonce,
    //                                 confirm_rate: doc.confirm_rate || 0,
    //                                 action_time: doc.action_time,
    //                                 complete_time: doc.complete_time,
    //                                 forms: doc.forms,
    //                                 seq: lsh.seq + 1 ,
    //                                 prev_hash: lsh.hash,
    //                                 hash: createHash({
    //                                     prevHash: lsh.hash,
    //                                     from: asset.genesis_wallet,
    //                                     to: env.MINERS_WALLET_ADDRESS,
    //                                     amount: 0 - Math.abs(fee.mnt),
    //                                     asset: 'MNT',
    //                                     nonce: doc.nonce
    //                                 })
    //                             });
    //                             break;
    //
    //                         case 4:
    //                             tx = _.cloneDeep({
    //                                 type,
    //                                 from: env.MINERS_WALLET_ADDRESS,
    //                                 to: asset.genesis_wallet,
    //                                 fee_from: env.MINERS_WALLET_ADDRESS,
    //                                 amount: Math.abs(fee.mnt),
    //                                 sign: doc.sign,
    //                                 asset: 'MNT',
    //                                 desc: doc.desc,
    //                                 fee: 0,
    //                                 fee_asset: 'MNT',
    //                                 nonce: doc.nonce,
    //                                 confirm_rate: doc.confirm_rate || 0,
    //                                 action_time: doc.action_time,
    //                                 complete_time: doc.complete_time,
    //                                 forms: doc.forms,
    //                                 seq: lsh.seq + 1 ,
    //                                 prev_hash: lsh.hash,
    //                                 hash: createHash({
    //                                     prevHash: lsh.hash,
    //                                     from: env.MINERS_WALLET_ADDRESS,
    //                                     to: asset.genesis_wallet,
    //                                     amount: Math.abs(fee.mnt),
    //                                     asset: 'MNT',
    //                                     nonce: doc.nonce
    //                                 })
    //                             });
    //                             break;
    //                     }
    //
    //                     let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
    //                     docs.push(_.cloneDeep({ _id: id, ...tx }));
    //                     lsh = _.cloneDeep({ seq: tx.seq, hash: tx.hash });
    //                 }
    //             }
    //
    //             await session.commitTransaction();
    //             session.endSession();
    //             await pubsub.publish('TX_ADDED', { tx: docs });
    //             return docs.find(doc => doc.type === 1 );
    //         } catch (e) {
    //             if (e.errorLabels && e.errorLabels.indexOf('TransientTransactionError') !== -1) {
    //                 console.log('TransientTransactionError, retrying transaction ...');
    //                 await session.abortTransaction();
    //                 continue;
    //             }
    //
    //             await session.abortTransaction();
    //             session.endSession();
    //             throw e;
    //         }
    //     }
    // }

    static async deleteTxData(hash){
        let updated = await db.collection('tx').findOneAndUpdate(
            {
                hash
            },
            {
                $unset: {
                    data: 1
                }
            },
            {
                returnOriginal: false
            }
        );

        if(updated.value){
            await pubsub.publish('TX_ADDED', { tx: [ updated.value ] });
        }

        return true;
    }

    static async updateConfirmRate(seq){
        return await  db.collection('tx').updateOne({ seq }, { $inc: { confirm_rate : 1}});
    }
}

module.exports = Tx;