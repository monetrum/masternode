'use strict';

const codes = {};
//----------------------------------------------------------------------------------------------------------------------
codes['send-account-unlock-code'] = 1;
codes['send-account-lock-code'] = 2;
codes['lock-account'] = 3;
codes['unlock-account'] = 4;
codes['login'] = 5;
codes['send-email-verification-code'] = 6;
codes['send-forgot-password-code'] = 7;
codes['change-password'] = 8;
codes['register'] = 9;
codes['verify-email'] = 10;
codes['account-change-password'] = 11;
codes['send-account-lock-code'] = 12;
codes['change-auth-type'] = 13;
codes['change-profile'] = 14;
codes['send-phone-verification-code'] = 15;
codes['verify-phone'] = 16;
codes['send-id-verification-image'] = 17;
codes['change-allowed-ips-old'] = 18;
codes['change-allowed-ips'] = 19;
codes['add-client-token'] = 20;
codes['delete-client-token'] = 21;
//----------------------------------------------------------------------------------------------------------------------
module.exports = codes;

