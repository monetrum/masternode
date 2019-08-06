'use strict';
const { filtererAndSorter: { filtererAndSorter, generateCursorString } } = registry.get('helpers');
const { ObjectID } = require('mongodb');
const db = registry.get('db');

class Assets {

    static async getAssets(filters, sorting, cursor, limit){
        let castRules = [
            { column: '_id', cast: x => ObjectID(x) }
        ];

        if(!limit || limit > 1000){
            limit = 1000;
        }

        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filters, sorting, cursor, { filter: { }, sort:{ } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];
        let next_cursor = null;
        let count = await db.collection('assets').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
        let assets = await db.collection('assets').find(listAnd.length > 0 ? { $and: listAnd } : { }).sort(sort).limit(limit).toArray();
        let lastRow = {};

        if(assets.length > 0){
            lastRow = assets[assets.length - 1];
            next_cursor = generateCursorString({ _id: lastRow._id.toString() });
        }

        return {
            assets,
            count,
            next_cursor
        }
    }

    static async getAsset(filters, fields){
        let pipeline = { };
        if(filters.name){
            pipeline.name = filters.name;
        }

        if(filters.symbol){
            pipeline.symbol = filters.symbol;
        }

        if(filters._id){
            pipeline._id = filters._id;
        }

        let asset = await db.collection('assets').findOne(pipeline);

        if('total_transfer' in fields){
            asset.total_transfer = await db.collection('tx').find({ asset: asset.symbol }).count();
        }

        if('total_price' in fields){
            let aggregate = [
                {
                    $match: {
                        type: 2,
                        asset: asset.symbol
                    }
                },
                {
                    $group: {
                        _id: 1,
                        sum: {
                            $sum: '$amount'
                        }
                    }
                }
            ];

            let first = (await db.collection('tx').aggregate(aggregate).toArray()).shift();
            asset.total_price = first ? first.sum : 0.00;
        }

        return asset;
    }
}

module.exports = Assets;