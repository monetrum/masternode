'use strict';
const env = registry.get('env');
const request = require('request-promise-native');

async function sendSms(serverName, to, message){
    let data = '';
    data += '<?xml version="1.0"?>';
    data += '<PACKET>';
    data += '<USERNAME>' + env.SMS_USER + '</USERNAME>';
    data += '<PASSWORD>' + env.SMS_PASSWORD + '</PASSWORD>';
    data += '<ORIGINATOR>' + serverName + '</ORIGINATOR>';
    data += '<STARTDATE></STARTDATE>';
    data += '<EXPIREDATE></EXPIREDATE>';
    data += '<PHONENUMBER>' + to + '</PHONENUMBER>';
    data += '<MESSAGE><![CDATA[' + message + ']]></MESSAGE>';
    data += '<MESSAGETYPE>1</MESSAGETYPE>';
    data += '</PACKET>';

    try {
        let response = await request.post({url: env.SMS_SEND_URL, body: data});
        return response.match(/^OK-\d+/i) !== null;
    } catch (e) {
        throw new Error('Sms apisine bağlanılamadı');
    }

}

module.exports = sendSms;