'use strict';

const DataLoader = require('dataloader');
const model = require(appDir + '/models/wallet/wallet');

function balances(){
    return new DataLoader(addresses => {
        return new Promise(async resolve => {
            let balances = await model.walletsBalances(addresses);
            let result = addresses.map( a => balances.find(b => a === b.address).balances );
            resolve(result);
        })
    })
}

module.exports = balances;