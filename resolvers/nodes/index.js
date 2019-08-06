'use strict';
const logger = registry.get('logger');
const model = require(appDir + '/models/nodes/nodes');
const graphqlFields = require('graphql-fields');
const iplocation = require('iplocation').default;
const request = require('request-promise-native');
const { stc } = registry.get('helpers');

class Resolvers {

    static async getNodes({ filters, sorting, limit, cursor }, context, info){
        return await model.getNodes(filters, sorting, cursor, limit, graphqlFields(info));
    }

    static async addNode({ info }, context){
        let { validators: nodesValidators } = context.MVS.get('nodes');
        let { messages: commonMessages } = context.MVS.get('common');
        try {
            await nodesValidators.add.validate(info);
            let ip = context.req.get('X-Real-IP') || context.req.ip;
            let { country, countryCode, city, latitude, timezone, region, longitude } = await iplocation(ip, []);
            let test = await stc(async () => JSON.parse(await request.get(info.ssl === true ? 'https:': 'http:' + `//${ip}:${info.port}/test`, { timeout: 3000 })));
            let accessible_service = !(test instanceof Error);
            let location = { country, country_code: countryCode, city, latitude, timezone, region, longitude };
            return await model.addNode({ ...info, ip, location, accessible_service });
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }
}

module.exports = Resolvers;