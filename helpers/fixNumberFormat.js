'use strict';

const numeral = require('numeral');

function fixNumberFormat(number) {
    let stringNumber = String(number);
    let split = stringNumber.split('.');

    if(split[1].length <= 8){
        return number;
    }

    return numeral(number).format('0.00000000');
}

module.exports = fixNumberFormat;