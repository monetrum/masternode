'use strict';
const db = registry.get('db');
const { ObjectID, Long } = require('mongodb');
const moment = require('moment');
const { filtererAndSorter: { filtererAndSorter, generateCursorString} } = registry.get('helpers');
const pubsub = registry.get('pubsub');

class Wallet {

    static async last5tx(addresses){
        let aggregate = [
            {
                $match: {
                    address: {
                        $in: addresses
                    }
                }
            },
            {
                $lookup: {
                    from: 'tx',
                    let: {
                        address: '$address'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$from', '$$address']
                                }
                            }
                        },
                        {
                            $sort: {
                                seq: -1
                            }
                        },
                        {
                            $limit: 5
                        }
                    ],
                    as: 'txes'
                }
            }
        ];

        return await db.collection('wallets').aggregate(aggregate).toArray();
    }

    static async walletsBalances(addresses){
        let aggregate = [
            {
                $match: {
                    address: {
                        $in: addresses
                    }
                }
            },
            {
                $lookup: {
                    from: 'tx',
                    let: {
                        address: '$address'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$from', '$$address']
                                        },
                                        {
                                            $in: ['$type', [ -2, 1, 2, 3, 4 ]]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    asset: '$asset'
                                },
                                balance: {
                                    $sum: '$amount'
                                }
                            }
                        },
                        {
                            $project: {
                                asset: '$_id.asset',
                                balance: '$balance'
                            }
                        }

                    ],
                    as: 'balances'
                }
            },
            {
                $project: {
                    address: '$address',
                    balances: '$balances'
                }
            }
        ];

        return await db.collection('wallets').aggregate(aggregate).toArray();
    }

    static async getWalletByAddress(address){
        return await db.collection('wallets').findOne({ address });
    }

    static async checkAccountById(account_id){
        return !! await db.collection('accounts').findOne({ _id: ObjectID(account_id) });
    }

    static async checkSmartContract(account_id, contract_id){
        return !!await db.collection('wallets').findOne({ account_id: { $ne: ObjectID(account_id) }, contract_id: ObjectID(contract_id)});
    }

    static async getWallets(account_id, cursor, fields){
        let castRules = [
            { column: '_id', cast: x => ObjectID(x) }
        ];

        let filter = {
            account_id: ObjectID(account_id)
        };

        let count = 0;
        let wallets = [];
        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filter, { _id: 'ASC' }, cursor, { filter: { }, sort:{ } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];

        if('count' in fields){
            count = await db.collection('wallets').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
        }

        if('wallets' in fields){
            wallets = await db.collection('wallets').find(listAnd.length > 0 ? { $and: listAnd } : { }).sort(sort).limit(100).toArray();
        }

        let next_cursor = null;
        let lastRow = {};
        if(wallets.length > 0){
            lastRow = wallets[wallets.length - 1];
            next_cursor = generateCursorString({ _id: lastRow._id.toString() });
        }

        return {
            wallets,
            count,
            next_cursor
        }
    }


    static async getWalletBalanceByAddressAndAssets(address, assets = []){
        let match = {
            from: address,
            type: {
                $in: [ -2, 1, 2, 3, 4 ]
            }
        };

        if(assets.length > 0){
            match.asset = {
                $in: assets
            };
        }

        let aggregate = [
            {
                $match: match
            },
            {
                $group: {
                    _id: {
                        asset: '$asset'
                    },
                    balance: {
                        $sum: '$amount'
                    }
                }
            },
            {
                $project: {
                    asset: '$_id.asset',
                    balance: {
                        $ifNull: ['$balance', 0.0]
                    }
                }
            }
        ];

        return await db.collection('tx').aggregate(aggregate).toArray();
    }

    static async getBalancesByAccountAndAssets(account_id, assets = [], cursor, fields){

        let castRules = [
            { column: '_id', cast: x => ObjectID(x) }
        ];

        let filter = {
            account_id: ObjectID(account_id)
        };

        let count = 0;
        let wallets = [];
        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filter, { _id: 'ASC' }, cursor, { filter: { }, sort:{ } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];
        let match = { };

        if(listAnd.length > 0){
            match = {
                $and: listAnd
            };
        }

        let lookupMatch = [
            {
                $match: {
                    $expr: {
                        $and: [
                            {
                                $eq: ['$from', '$$address']
                            },
                            {
                                $in: ['$type', [ -2, 1, 2, 3, 4 ]]
                            }
                        ]
                    }
                }
            }
        ];

        if(assets.length > 0){
            lookupMatch.first().$match.$expr.$and.push({ $in: ['$asset', assets] });
        }

        let aggregate = [
            {
                $match: match
            },
            {
                $limit: 100
            },
            {
                $sort: sort
            },
            {
                $lookup: {
                    from: 'tx',
                    let: {
                        address: '$address'
                    },
                    pipeline: [
                        ...lookupMatch,
                        {
                            $group: {
                                _id: {
                                    from: '$from',
                                    asset: '$asset'
                                },
                                balance: {
                                    $sum: '$amount'
                                }
                            }
                        },
                        {
                            $project: {
                                asset: '$_id.asset',
                                balance: {
                                    $ifNull: ['$balance', 0.0]
                                }
                            }
                        },
                    ],
                    as: 'balances'
                }
            },
            {
                $project: {
                    address: '$address',
                    balances: '$balances'
                }
            }
        ];

        if('count' in fields){
            count = await db.collection('wallets').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
        }

        if('wallets' in fields){
            wallets = await db.collection('wallets').aggregate(aggregate).toArray();
        }

        let next_cursor = null;
        let lastRow = {};

        if(wallets.length > 0){
            lastRow = wallets[wallets.length - 1];
            next_cursor = generateCursorString({ _id: lastRow._id.toString() });
        }

        return {
            wallets,
            count,
            next_cursor
        }
    }

    static async save(account_id, address, contract_id, wallet_data){
        let document = {};
        try {
            document.account_id = ObjectID(account_id);
            document.asset = 'MNT';
            document.address = address;
            document.insert_time = Long.fromNumber(moment().utc().toDate().getTime());
            document.wallet_data = wallet_data || { };
            if(contract_id){
                document.contract_id = ObjectID(contract_id);
            }

            let id = (await db.collection('wallets').insertOne(document)).insertedId;
            await pubsub.publish('WALLET_ADDED', { wallet: { _id: id, ...document } });
            return true;
        } catch (e) {
            if(e.name === 'MongoError' && e.code === 11000){
                return true;
            }

            throw e;
        }
    }

    static async update(address, contract_id, wallet_data, prev_wallet_data){
        let document = {};
        if(contract_id){
            document.contract_id = ObjectID(contract_id);
        }

        document.wallet_data = { ...prev_wallet_data, ...wallet_data };
        let updated = await db.collection('wallets').findOneAndUpdate(
            {
                address
            },
            {
                $set: document
            },
            {
                returnOriginal: false
            }
        );

        if(updated.value){
            await pubsub.publish('WALLET_ADDED', { wallet: updated.value });
        }

        return true;
    }
}

module.exports = Wallet;