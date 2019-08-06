'use strict';

const request = require('request-promise-native');
const accessKey = '111111-222222-333333-444444';
const checkURL = 'http://proxycheck.io/v2/{{IP}}?key={{accesKey}}&vpn=1&asn=1&node=1&time=1&inf=0&port=1&seen=1&days=7&tag=msg';
const logger = registry.get('logger');

async function checkVPN(IP){
    try {
        let response = await request.get(checkURL.replace('{{IP}}', IP).replace('{{accessKey}}', accessKey));
        let JSONResponse = JSON.parse(response);
        return (JSONResponse.status === 'ok' && JSONResponse[IP].proxy === 'yes');
    } catch (e) {
        logger.error(`VPN kontrol edilemedi sebep: ${e.message}`);
        return false;
    }
}

module.exports = checkVPN;