'use strict';

class Send {

    constructor(tx, owner_wallet) {

    }

    async setData(id, data = {}, crypto) {
        return true;
    }

    async send(to, amount, asset, desc = null, data = {}, forms = {}, public_key) {
        return true;
    }

    async getBalance(address, asset) {
        return 0.00;
    }

    setError(errorMessage) {
        return true;
    }

    async connect({ host, method, port, path, headers = {} } = params, data) {
        return true;
    }

    async createAsset(supply, name, symbol, icon = "") {
        return true;
    }

    async burnAsset(public_key, symbol, amount) {
        return true;
    }
}

module.exports = Send;
