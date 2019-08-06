'use strict';
//const keys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'Y', 'Z'];
const keys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
function randomCode(min, max){
    let tmp = [];
    let randStep = Math.floor(Math.random() * (max - min) ) + min;
    for(let i = 0; i <= randStep; i++){
        tmp.push(keys[Math.floor(Math.random() * keys.length)]);
    }

    return tmp.join('');
}

module.exports = randomCode;
