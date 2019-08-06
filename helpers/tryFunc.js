'use strict';

function tryFunc(bind, func, ...args){
    return new Promise(async resolve => process.nextTick(async () => resolve(await func.call(bind, ...args))));
}

module.exports = tryFunc;