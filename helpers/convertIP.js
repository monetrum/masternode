'use strict';
const ipaddr = require('ipaddr.js');

function convertIP(IP){
    return ipaddr.parse(IP).toNormalizedString();
}

module.exports = convertIP;