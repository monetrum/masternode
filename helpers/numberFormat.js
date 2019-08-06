'use strict';

const numeral = require('numeral');

function numberFormat (number, decimals) {

    let defaultNum = 0.00000001;
    let defaultFormat = '0.00000';
    let format = '0.';

    for(let i = 1; i <= decimals; i++){
        format += '0';
    }

    if (number < defaultNum) {
        return numeral(0).format(defaultFormat);
    }

    return numeral(number).format(format);
}

module.exports = numberFormat;