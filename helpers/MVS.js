'use strict';

const requireDir = require('require-dir');
const langs = requireDir(appDir + '/messages-validators', {recurse: true});

class MVS {

    constructor(langCode){
        this.langCode = langCode;
    }

    get(filePath){
        let pathArray = filePath.split('/').filter(i => i !== '');
        let tmp;

        for(let i = 0; i < pathArray.length; i++){
            if(i === 0){
                tmp = langs[this.langCode];
            }

            if(typeof tmp[pathArray[i]] === 'undefined'){
                throw new Error(pathArray[i] + ' Bulunamadı');
            }

            tmp = tmp[pathArray[i]];
        }

        return tmp;
    }
}

module.exports = MVS;