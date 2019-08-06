'use strict';

const ejs = require('ejs');

function renderMailBody(lang, fileName, data, options = {}){
    return new Promise((resolve, reject) => {
        ejs.renderFile(`${appDir}/templates/email/${lang}/${fileName}`, data, options, (err, str) => {
            if(err){
                reject(err);
                return;
            }

            resolve(str);
        });
    });
}

module.exports = renderMailBody;