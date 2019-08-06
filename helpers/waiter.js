'use strict';

const WMap = new Map();

function wait(key){
    let resolvers = WMap.get(key) || WMap.set(key, []).get(key);
    return new Promise(resolve => {
        resolvers.push(resolve);
    });
}

function go(key, all = false){
    if(WMap.has(key)){
        let resolvers = WMap.get(key);
        if(all === false){
            let resolve = resolvers.shift();
            if(resolve){
                resolve(true);
            }

            return;
        }

        for(let resolve of resolvers){
            resolve(true);
        }

        WMap.set(key, []);
    }
}


module.exports = { wait, go };