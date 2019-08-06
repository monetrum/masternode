'use strict';

function isMaster(){
    if(typeof process.env.NODE_APP_INSTANCE == 'undefined'){
        return true;
    }
    return process.env.NODE_APP_INSTANCE === '0';
}

module.exports = isMaster;