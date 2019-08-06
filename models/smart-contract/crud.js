'use strict';
const { ObjectID, Binary } = require('mongodb');
const db = registry.get('db');
const client = registry.get('mongoClient');
const moment = require('moment');
const { filtererAndSorter: { filtererAndSorter, generateCursorString} } = registry.get('helpers');
const pubsub = registry.get('pubsub');

class Crud {

    static async getContractByAddress(address){
        let wallet = await db.collection('wallets').findOne({ address });
        if(!wallet) return null;
        if(!('contract_id' in wallet)) return null;
        let contract = await db.collection('contracts').findOne({ _id: ObjectID(wallet.contract_id) });
        if(!contract) return null;
        return contract;
    }

    static async getAccountById(account_id){
        return await db.collection('accounts').findOne({_id: ObjectID(account_id)});
    }

    static async checkInContractTx(contract_id){
        return !! await db.collection('tx').findOne({ contract: ObjectID(contract_id) });
    }

    static async getBalanceByAddressAndAsset(address, asset) {
        let balanceAgg = [
            {
                $match: {
                    type: {
                        $ne: 0
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

    static async getContracts(filters, sorting, cursor) {
        let castRules = [
            {column: '_id', cast: x => ObjectID(x)},
            {column: 'created_date', cast: x => moment(x).toDate()}
        ];

        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filters, sorting, cursor, { filter: { }, sort: { } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];
        let count = await db.collection('contracts').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
        let contracts = await db.collection('contracts').find(listAnd.length > 0 ? { $and: listAnd } : { }).sort(sort).limit(100).toArray();
        let next_cursor = null;
        let lastRow = {};
        if(contracts.length > 0){
            lastRow = contracts[contracts.length - 1];
            next_cursor = generateCursorString({ created_date: lastRow.created_date, _id: lastRow._id.toString() });
        }

        return {
            contracts,
            count,
            next_cursor
        }

    }

    static async getContract(_id, account_id){
        return await db.collection('contracts').findOne({ _id: ObjectID(_id), account_id: ObjectID(account_id) });
    }


    static async create(account_id, name, code, desc, detail, image, is_private){
        let session = client.startSession();
        try {
            await session.startTransaction();
            let sc = {
                account_id: ObjectID(account_id),
                code: Binary(Buffer.from(code, 'utf8')),
                created_date: moment().utc().toDate(),
                updated_date: moment().utc().toDate(),
                is_private
            };

            if(name){
                sc.name = name;
            }

            if(desc){
                sc.desc = desc;
            }

            if(detail){
                sc.detail = detail;
            }

            if(image){
                sc.image = Binary(Buffer.from(image, 'utf8'));
            }

            let id = (await db.collection('contracts').insertOne(sc, { session })).insertedId;
            await pubsub.publish('CONTRACT_ADDED', { contract: { _id: id, ...sc } });
            await session.commitTransaction();
            session.endSession();
            return { _id: id, ...sc };

        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            throw e;
        }
    }

    // static async update(_id, account_id, name, code){
    //     let session = client.startSession();
    //     try {
    //         await session.startTransaction();
    //         let sc = {};
    //         if(name){
    //             sc.name = name;
    //         }
    //
    //         sc.code = Binary(Buffer.from(code, 'utf8'));
    //         sc.updated_date = moment().utc().toDate();
    //         let updated = await db.collection('contracts').findOneAndUpdate(
    //             {_id: ObjectID(_id), account_id: ObjectID(account_id)},
    //             {$set: sc},
    //             {returnOriginal: false}
    //         );
    //         await session.commitTransaction();
    //         session.endSession();
    //         return {
    //             _id: updated.value._id,
    //             account_id,
    //             code,
    //             name: updated.value.name,
    //             created_date: updated.value.created_date,
    //             updated_date: updated.value.updated_date
    //         };
    //
    //     } catch (e) {
    //         await session.abortTransaction();
    //         session.endSession();
    //         throw e;
    //     }
    // }
    //
    //
    // static async delete(_id, account_id){
    //     let session = client.startSession();
    //     try {
    //         await session.startTransaction();
    //         let smartContract = await db.collection('contracts').findOneAndDelete(
    //             {_id: ObjectID(_id), account_id: ObjectID(account_id)}
    //         );
    //
    //         if(!smartContract.value){
    //             await session.abortTransaction();
    //             session.endSession();
    //             return false;
    //         }
    //
    //         await db.collection('wallets').updateMany(
    //             {contract_id: ObjectID(_id), account_id: ObjectID(account_id)},
    //             {
    //                 $unset: {
    //                     contract_id: ''
    //                 }
    //             }
    //         );
    //
    //         await session.commitTransaction();
    //         session.endSession();
    //         return true;
    //
    //     } catch (e) {
    //         await session.abortTransaction();
    //         session.endSession();
    //         throw e;
    //     }
    // }
}

module.exports = Crud;