'use strict';
const { Long, ObjectID, Binary } = require('mongodb');
const db = registry.get('db');
const client = registry.get('mongoClient');
const env = registry.get('env');
const moment = require('moment');
const { tryFunc, blockchain: { createHash }, objectSizeOf, ecdsa: { signing } } = registry.get('helpers');
const pubsub = registry.get('pubsub');
const _ = require('lodash');
const CryptoMon = require(appDir + '/library/cryptoMon');
const { fee } = registry.get('consts');

class Perform {

    static async getAccountById(id){
        return await db.collection('accounts').findOne({ _id: ObjectID(id) });
    }

    static async getAssetByWalletAndSymbol(wallet, symbol){
        return await db.collection('assets').findOne({ genesis_wallet: wallet, symbol });
    }

    static async getAssetBySymbol(symbol){
        return await db.collection('assets').findOne({ symbol });
    }

    static async getWalletByAddress(address){
        return await db.collection('wallets').findOne({ address });
    }

    static async getContractById(_id){
        return await db.collection('contracts').findOne({ _id: ObjectID(_id) });
    }

    static async setTxType(_id, type){
        let find = {
            _id: ObjectID(_id)
        };

        let set = {
            $set: {
                type
            }
        };

        let options = {
            returnOriginal: false
        };

        let updatedTx = await db.collection('tx').findOneAndUpdate(find, set, options);
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

    static async approve(txIds, public_key){
        let session = client.startSession();
        while (true){
            try {
                await session.startTransaction();

                let docs = [];
                let pipeline = { _id: { $in: txIds.map(x => ObjectID(x.tx_id)) }, type: -2 };
                let txes = await db.collection('tx').find(pipeline, { session }).toArray();
                let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
                let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
                if(lastTx){
                    lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
                }

                for(let tx of txes){
                    let doc = _.cloneDeep(tx);
                    let addivite = {};
                    let txData = txIds.find(x => x.tx_id.toString() === tx._id.toString());
                    //let byteOfData = objectSizeOf(txData.data);
                    //let feeOfData = byteOfData * fee.byte;
                    let balance = (await this.getBalanceByAddressAndAsset(tx.from, tx.asset)) + Math.abs(tx.amount);
                    let feeBalance = balance + Math.abs(tx.fee);
                    let asset = await this.getAssetBySymbol(tx.asset);
                    let assetBalance = await this.getBalanceByAddressAndAsset(asset.genesis_wallet, 'MNT');

                    if(tx.fee_from !== tx.from){
                        feeBalance = (await this.getBalanceByAddressAndAsset(tx.fee_from, tx.asset)) + Math.abs(tx.fee);
                    }

                    //console.log(byteOfData, feeOfData);

                    let isOwnerSelf = tx.fee === 0;
                    if(!isOwnerSelf && tx.fee_from !== tx.from && feeBalance < asset.fee){
                        await session.abortTransaction();
                        session.endSession();
                        let subsDocs = [];
                        for(let utx of txes){
                            let txData = txIds.find(x => x.tx_id.toString() === utx._id.toString());
                            let data = txData.data;

                            if(public_key){
                                let cryptoMon = new CryptoMon(public_key);
                                data = cryptoMon.encrypt(JSON.stringify(data));
                            }

                            let findQuery = { _id: utx._id };
                            let setQuery = { type: 0, data };
                            let options = { returnOriginal: false };
                            let updated = await db.collection('tx').findOneAndUpdate(findQuery, setQuery, options);
                            subsDocs.push(updated.value);
                        }

                        await pubsub.publish('TX_ADDED', { tx: subsDocs });
                        return false;
                    }

                    //kendi cüzdanına göndermiyorsa fee_from ve from aynı ise, balance amount + fee den küçükse
                    if(!isOwnerSelf && tx.fee_from === tx.from && balance < Math.abs(tx.amount) + asset.fee){
                        await session.abortTransaction();
                        session.endSession();
                        let subsDocs = [];
                        for(let utx of txes){
                            let txData = txIds.find(x => x.tx_id.toString() === utx._id.toString());
                            let data = txData.data;

                            if(public_key){
                                let cryptoMon = new CryptoMon(public_key);
                                data = cryptoMon.encrypt(JSON.stringify(data));
                            }

                            let findQuery = { _id: utx._id };
                            let setQuery = { type: 0, data };
                            let options = { returnOriginal: false };
                            let updated = await db.collection('tx').findOneAndUpdate(findQuery, setQuery, options );
                            subsDocs.push(updated.value);
                        }

                        await pubsub.publish('TX_ADDED', { tx: subsDocs });
                        return false;
                    }

                    // kendi cüzdanına gönderiyorsa fee_from ve fee eşitse balance, amounttan küçükse
                    if(isOwnerSelf && balance < Math.abs(tx.amount)){
                        await session.abortTransaction();
                        session.endSession();
                        let subsDocs = [];
                        for(let utx of txes){
                            let txData = txIds.find(x => x.tx_id.toString() === utx._id.toString());
                            let data = txData.data;

                            if(public_key){
                                let cryptoMon = new CryptoMon(public_key);
                                data = cryptoMon.encrypt(JSON.stringify(data));
                            }

                            let findQuery = { _id: utx._id };
                            let setQuery = { type: 0, data };
                            let options = { returnOriginal: false };
                            let updated = await db.collection('tx').findOneAndUpdate(findQuery, setQuery, options);
                            subsDocs.push(updated.value);
                        }

                        await pubsub.publish('TX_ADDED', { tx: subsDocs });
                        return false;
                    }

                    // asset sahibinin MNT balance'ı yetersizse
                    if(assetBalance < fee.mnt){
                        await session.abortTransaction();
                        session.endSession();
                        let subsDocs = [];
                        for(let utx of txes){
                            let txData = txIds.find(x => x.tx_id.toString() === utx._id.toString());
                            let data = txData.data;

                            if(public_key){
                                let cryptoMon = new CryptoMon(public_key);
                                data = cryptoMon.encrypt(JSON.stringify(data));
                            }

                            let findQuery = { _id: utx._id };
                            let setQuery = { type: 0, data };
                            let options = { returnOriginal: false };
                            let updated = await db.collection('tx').findOneAndUpdate(findQuery, setQuery, options);
                            subsDocs.push(updated.value);
                        }

                        await pubsub.publish('TX_ADDED', { tx: subsDocs });
                        return false;
                    }

                    // tx handle
                    let types = tx.fee === 0 ? [ 2 ] : [ 2, 3, 4];
                    for(let type of types){
                        switch (type) {
                            case 2:
                                addivite = _.cloneDeep({
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
                                addivite = _.cloneDeep({
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
                                    seq: lsh.seq + 1,
                                    prev_hash: lsh.hash,
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
                                addivite = _.cloneDeep({
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
                                    seq: lsh.seq + 1,
                                    prev_hash: lsh.hash,
                                    hash: createHash({
                                        prevHash: lsh.hash,
                                        from: asset.genesis_wallet,
                                        to: doc.fee_from,
                                        amount: Math.abs(doc.fee),
                                        asset: doc.asset,
                                        nonce: doc.nonce,
                                    })
                                });
                                break;
                        }

                        let id = (await db.collection('tx').insertOne(addivite, { session })).insertedId;
                        docs.push(_.cloneDeep({ _id: id, ...addivite }));
                        lsh = _.cloneDeep({ seq: addivite.seq, hash: addivite.hash });

                    }

                    let feetypes = tx.fee === 0 ? [] : [ 3 ,4 ];
                    for(let type of feetypes){
                        switch (type) {
                            case 3:
                                addivite = _.cloneDeep({
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
                                addivite = _.cloneDeep({
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
                                        asset: 'MNT',
                                        amount: Math.abs(fee.mnt),
                                        nonce: doc.nonce
                                    })
                                });
                                break;
                        }

                        let id = (await db.collection('tx').insertOne(addivite, { session })).insertedId;
                        docs.push(_.cloneDeep({ _id: id, ...addivite }));
                        lsh = _.cloneDeep({ seq: addivite.seq, hash: addivite.hash });
                    }

                    let data = txData.data;
                    if(public_key){
                        let cryptoMon = new CryptoMon(public_key);
                        data = cryptoMon.encrypt(JSON.stringify(data));
                    }

                    let find = {
                        _id: tx._id
                    };

                    let set = {
                        $set: {
                            type: 1,
                            complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                            data
                        }
                    };

                    let options = {
                        returnOriginal: false,
                        session
                    };

                    let updatedTx = await db.collection('tx').findOneAndUpdate(find, set, options);
                    docs.push(updatedTx.value);
                }

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

    static async cancel(txIds, public_key){
        let session = client.startSession();
        try {
            await session.startTransaction();
            let docs = [];
            for (let txId of txIds){
                let finded = await db.collection('tx').findOne({ _id: ObjectID(txId.tx_id), type: -2 });
                let data = txId.data;
                if(finded && public_key){
                    let cryptoMon = new CryptoMon(public_key);
                    data = cryptoMon.encrypt(JSON.stringify(data) || '');
                }

                let find = {
                    _id: ObjectID(txId.tx_id),
                    type: -2
                };

                let set = {
                    $set: {
                        type: 0,
                        data
                    }
                };

                let options = {
                    returnOriginal: false,
                    session
                };

                let updated = await db.collection('tx').findOneAndUpdate(find, set, options);
                docs.push(updated.value);
            }

            await session.commitTransaction();
            session.endSession();
            await pubsub.publish('TX_ADDED', { tx: docs });
            return true;
        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            throw e;
        }
    }

    static async createAsset(contract_id, hash, owner, wallet, supply, name, symbol, icon){
        let session = client.startSession();
        let point = 1;

        while(true){
            try {
                await session.startTransaction();
                point = 1;
                let asset = {
                    contract_id,
                    owner,
                    genesis_wallet: wallet,
                    genesis_block: hash,
                    name,
                    symbol,
                    supply,
                    date: moment().utc().toDate(),
                    fee: 1.0,
                    exchange_rate: 1.0
                };

                if(icon){
                    asset.icon = Binary(Buffer.from(icon, 'utf8'));
                }

                let assetId = (await db.collection('assets').insertOne(asset, { session })).insertedId;

                point = 2;
                let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
                let nonce = String(moment().utc().toDate().getTime());
                let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
                if(lastTx){
                    lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
                }

                let tx = {
                    type: 2,
                    hash: createHash({
                        prevHash: lsh.hash,
                        from: wallet,
                        to: env.SYSTEM_WALLET,
                        amount: supply,
                        asset: symbol,
                        nonce: nonce
                    }),
                    data: {},
                    amount: Math.abs(supply),
                    asset: symbol,
                    seq: lsh.seq + 1,
                    prev_hash: lsh.hash,
                    desc: 'Yeni Asset Girişi',
                    fee: 0,
                    fee_asset: 'MNT',
                    nonce: nonce,
                    action_time: Long.fromNumber(moment().utc().toDate().getTime()),
                    complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                    from: wallet,
                    to: env.SYSTEM_WALLET,
                    fee_from: wallet,
                    confirm_rate: 0
                };

                let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
                await session.commitTransaction();
                session.endSession();
                await pubsub.publish('TX_ADDED', { tx: [ { _id: id, ...tx } ] });
                await pubsub.publish('ASSET_ADDED', { asset: { _id: assetId, ...asset } });
                return true;

            } catch (e) {
                if (e.errorLabels && e.errorLabels.indexOf('TransientTransactionError') !== -1 && point === 2) {
                    console.log('TransientTransactionError, retrying transaction ...');
                    await session.abortTransaction();
                    continue;
                }

                if(e.name === 'MongoError' && e.code === 11000 && point === 1){
                    await session.abortTransaction();
                    session.endSession();
                    return true;
                }

                throw e;
            }
        }
    }

    static async burnAsset(address, symbol, amount){
        let session = client.startSession();
        while(true){
            try {
                await session.startTransaction();
                let lastTx = (await db.collection('tx').find({ }, { session }).sort({ seq: -1 }).limit(1).toArray()).shift();
                let docs = [];
                let tx = { };
                let lsh = { hash: new Array(64).fill(0).join(''), seq: 1 };
                let nonce = String(moment().utc().toDate().getTime());
                let msg = `${address}__${env.SYSTEM_WALLET}__${0 - Math.abs(amount)}__${symbol}__${nonce}`;
                let sign = signing(env.SMART_CONTRACT_PRIVATE_KEY, msg);
                if(lastTx){
                    lsh = _.cloneDeep({ hash: lastTx.hash, seq: lastTx.seq });
                }

                for(let type of [ 1, 2]){
                    switch(type){
                        case 1:
                            tx = _.cloneDeep({
                                type,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: address,
                                    to: env.SYSTEM_WALLET,
                                    amount: 0 - Math.abs(amount),
                                    asset: symbol,
                                    nonce: nonce,
                                }),
                                data: { },
                                amount: 0 - Math.abs(amount),
                                asset: symbol,
                                seq: lsh.seq + 1,
                                prev_hash: lsh.hash,
                                sign: sign,
                                desc: 'Asset Yakma',
                                fee: 0,
                                fee_asset: 'MNT',
                                nonce: nonce,
                                action_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                from: address,
                                to: env.SYSTEM_WALLET,
                                fee_from: address,
                                confirm_rate: 0,
                                public_key: env.SMART_CONTRACT_PUBLIC_KEY,
                                contract_wallet: env.SMART_CONTRACT_WALLET_ADDRESS,
                            });
                            break;

                        case 2:
                            tx = _.cloneDeep({
                                type,
                                hash: createHash({
                                    prevHash: lsh.hash,
                                    from: env.SYSTEM_WALLET,
                                    to: address,
                                    amount: Math.abs(amount),
                                    asset: symbol,
                                    nonce: nonce,
                                }),
                                data: { },
                                amount: Math.abs(amount),
                                asset: symbol,
                                seq: lsh.seq + 1,
                                prev_hash: lsh.hash,
                                desc: 'Asset Yakma',
                                fee: 0,
                                fee_asset: 'MNT',
                                nonce: nonce,
                                action_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                                from: env.SYSTEM_WALLET,
                                to: address,
                                fee_from: env.SYSTEM_WALLET,
                                confirm_rate: 0
                            });
                            break;
                    }

                    lsh = _.cloneDeep({ seq: tx.seq , hash: tx.hash });
                    let id = (await db.collection('tx').insertOne(tx, { session })).insertedId;
                    docs.push(_.cloneDeep({ _id: id, ...tx }));
                }

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

module.exports = Perform;