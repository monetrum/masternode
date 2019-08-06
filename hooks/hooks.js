'use strict';

Array.prototype.first = function () {
    return this[0] ? this[0] : undefined;
};

Array.prototype.last = function () {
    return this[this.length - 1] ? this[this.length - 1] : undefined;
};

Array.prototype.get = function (index) {
    return this[index] ? this[index] : undefined;
};


Array.prototype.asyncMap = async function (callback) {
    let result = [];
    for(let elem of this){
        result.push(await callback(elem));
    }

    return result;
};

module.exports = { };