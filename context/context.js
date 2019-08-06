'use strict';
const model = require(appDir + '/models/context/context');
const { MVS } = registry.get('helpers');
const last5tx = require(appDir + '/dataLoaders/last5tx');
const balances = require(appDir + '/dataLoaders/balances');
const env = registry.get('env');

async function context({ req, connection }) {
    //------------------------------------------------------------------------------------------------------------------
    if(connection){
        return connection.context;
    }

    let data = {};

    data.dataLoaders = {
        last5tx: last5tx(),
        balances: balances()
    };

    data.issc = req.get('X-CONTRACT-TOKEN') === String(env.SMART_CONTRACT_SERVER_TOKEN);
    data.user = undefined;
    data.token = undefined;

    if(req.get('X-TOKEN') !== undefined){
        let userAndToken = await model.getUser(req.get('X-TOKEN'));
        if(userAndToken){
            data.user = userAndToken.user;
            data.token = userAndToken.token;
        }
    }

    //--------------------------------------------------------------------------------------------------------------
    data.req = req;
    //--------------------------------------------------------------------------------------------------------------
    data.MVS = new MVS(req.lang);
    //--------------------------------------------------------------------------------------------------------------
    return data;
}

module.exports = context;