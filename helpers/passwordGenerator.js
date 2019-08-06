'use strict';
const numbers    = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const uppercase  = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'Y', 'Z'];
const lowercase  = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'y', 'z'];
const characters = ['-', '!', '*', '%', '.'];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let rand = Math.floor(Math.random() * (i + 1));
        [array[i], array[rand]] = [array[rand], array[i]];
    }

    return array;
}

function passwordGenerator(){
    let tmp = [];
    for(let i = 0; i <= 2; i++){
        tmp.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    }

    for(let i = 0; i <= 2; i++){
        tmp.push(numbers[Math.floor(Math.random() * numbers.length)]);
    }

    for(let i = 0; i <= 2; i++){
        tmp.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    }

    for(let i = 0; i <= 2; i++){
        tmp.push(characters[Math.floor(Math.random() * characters.length)]);
    }

    return shuffle(tmp).join('');
}

module.exports = passwordGenerator;