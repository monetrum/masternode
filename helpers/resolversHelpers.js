'use strict';

function checkLogin(context) {
    let { messages } = context.MVS.get('common');
    if(!context.user){
        throw new Error(messages.invalidToken);
    }
}

module.exports = { checkLogin };