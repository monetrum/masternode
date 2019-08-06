'use strict';
const db = registry.get('db');

class Balances {

    static async increment(session, address, asset, amount){
        let find = { address, asset };
        let inc = { $inc: { balance: amount } };
        return await db.collection('balances').updateOne(find, inc, { session, upsert: true });
    }

    static async getBalance(address, assets = []){
        let pipeline = [
            {
                $match: {
                    address,
                    asset: {
                        $in: assets
                    }
                }
            },
            {
                $group: {
                    _id: '$address',
                    balances: {
                        $push: {
                            asset: '$asset',
                            balance: '$balance'
                        }
                    }
                }
            }
        ];

        return await db.collection('balances').aggregate(pipeline).toArray();
    }

    static async getBalances(addresses, assets = []){
        let pipeline = [
            {
                $match: {
                    address: {
                        $in: addresses
                    },
                    asset: {
                        $in: assets
                    }
                }
            },
            {
                $group: {
                    _id: '$address',
                    balances: {
                        $push: {
                            asset: '$asset',
                            balance: '$balance'
                        }
                    }
                }
            }
        ];

        return await db.collection('balances').aggregate(pipeline).toArray();
    }

}

module.exports = Balances;