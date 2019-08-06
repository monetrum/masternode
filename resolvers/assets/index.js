'use strict';
const graphqlFields = require('graphql-fields');
const model = require(appDir + '/models/assets/assets');

class Resolvers {

    static async getAssets({ filters, sorting, cursor, limit }){
        return await model.getAssets(filters, sorting, cursor, limit);
    }

    static async getAsset({ filters }, context, info){
        return await model.getAsset(filters, graphqlFields(info));
    }
}

module.exports = Resolvers;