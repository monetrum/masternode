'use strict';

// const feeObject = require(appDir + '/consts/fee');
// const moment = require('moment');
//
// function feeToProcessTime(asset, fee){
//     let now = moment().utc();
//     let processTime = 0;
//
//     if(!(asset in feeObject)){
//         return undefined;
//     }
//
//     if(fee <= feeObject[asset].min){
//         processTime = now.add(1, 'm').toDate().getTime();
//     } else if (fee >= feeObject[asset].max){
//         processTime = now.toDate().getTime();
//     } else {
//         let delaySeconds = Math.ceil(((fee - feeObject[asset].min) / (feeObject[asset].max - feeObject[asset].min)) * 60);
//         processTime = now.add(1, 'm').subtract(delaySeconds, 's').toDate().getTime();
//     }
//
//     return {processTime, mnt: (fee < feeObject[asset].min  ? feeObject[asset].mnt * feeObject[asset].min : fee * feeObject[asset].mnt )};
// }
//
// module.exports = feeToProcessTime;

module.exports = {};