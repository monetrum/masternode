'use strict';
const { ObjectID } = require('mongodb');
const db = registry.get('db');
const { filtererAndSorter: { filtererAndSorter, generateCursorString} } = registry.get('helpers');

class Nodes {

    static async addNode(node){
        let find = { ip: node.ip, port: node.port };
        let set = { $set: node };
        let options = { upsert: true, returnOriginal: false };
        let value = (await db.collection('nodes').findOneAndUpdate(find, set, options )).value;
        return value;
    }

    static async getNodes(filters, sorting, cursor, limit, fields){
        let castRules = [
            { column: '_id', cast: x => ObjectID(x) }
        ];

        if(!limit || limit > 1000){
            limit = 1000;
        }

        let { filterQuery, cursorQuery, sort } = filtererAndSorter(filters, sorting , cursor, { filter: { }, sort:{ } }, castRules, false);
        let countAnd = [ ...filterQuery ];
        let listAnd = [ ...filterQuery, ...cursorQuery ];
        let count = 0;
        let nodes = [];

        if('count' in fields){
            count = await db.collection('nodes').find(countAnd.length > 0 ? { $and: countAnd } : { }).count();
        }

        if('nodes' in fields){
            nodes = await db.collection('nodes').find(listAnd.length > 0 ? { $and: listAnd } : { }).sort(sort).limit(limit).toArray();
        }

        let next_cursor = null;
        let lastRow = { };
        if(nodes.length > 0){
            lastRow = nodes[nodes.length - 1];
            next_cursor = generateCursorString({ _id: lastRow._id.toString() });
        }

        return {
            nodes,
            count,
            next_cursor
        }
    }
}

module.exports = Nodes;