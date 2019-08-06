'use strict';

const situations = { };
//----------------------------------------------------------------------------------------------------------------------
situations['balance-insufficient'] = 100;
situations['asset-balance-insufficient'] = 101;
situations['asset-notfound'] = 102;
situations['fee-from-wallet-auth-error'] = 103;
situations['smart-contract-notfound'] = 104;
situations['smart-contract-did-not-allow'] = 105;

module.exports = situations;