'use strict';

async function asyncLoop (res, callback) {

    if(typeof callback !== 'function'){
        throw new Error('callback fonksiyon olmalıdır');
    }

    if(res === undefined || res == null || res === false){
        return;
    }

    try{

        let result = await callback(res);
        if(result === undefined || result === null || result === false){
            return;
        }

        return new Promise((resolve) => {
            process.nextTick(() => {
                resolve(asyncLoop(result, callback));
            });
        });

    } catch (e) {
        throw e;
    }
}

module.exports = asyncLoop;