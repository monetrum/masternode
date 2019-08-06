'use strict';

const languages = ['tr', 'en'];

function languageSelector(req, res, next) {
    let lang = req.get('Content-Language');
    if(!lang){
        req.lang = 'tr';
        next();
        return;
    }

    let parsedLang = String(lang.split('-')[0]);
    if(languages.indexOf(parsedLang) === -1){
        req.lang = 'tr';
        next();
        return;
    }

    req.lang = parsedLang.toLowerCase();

    next();
}

module.exports = languageSelector;