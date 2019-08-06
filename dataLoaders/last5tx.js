'use strict';

const DataLoader = require('dataloader');
const model = require(appDir + '/models/wallet/wallet');

function last5tx(){
    return new DataLoader(addresses => {
        return new Promise(async resolve => {
            let txes = await model.last5tx(addresses);
            let result = addresses.map( a => txes.find(t => a === t.address).txes );
            resolve(result);
        })
    })
}

module.exports = last5tx;