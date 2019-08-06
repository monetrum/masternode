'use strict';

async function forEach(arr, index = 0, callback) {
    if(!Array.isArray(arr) || typeof index != 'number' || typeof callback != 'function'){
        throw new Error('Parametre tipleri yanlış arr dizi, index integer, callback fonksiyon olmalıdır');
    }

    if(index > arr.length - 1) {
        return;
    }

    try {
        await callback(arr[index], index);
        return new Promise((resolve) => {
            process.nextTick(() => {
                resolve(forEach(arr, index + 1, callback));
            });
        });
    } catch (e) {
        throw e;
    }
}

module.exports = forEach;