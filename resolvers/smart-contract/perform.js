'use strict';
const env = registry.get('env');
const model = require(appDir + '/models/smart-contract/perform');
const { ecdsa: { addressFromPublicKey, signing }, stc } = registry.get('helpers');
const logger = registry.get('logger');
const moment = require('moment');
const { Long } = require('mongodb');
const CryptoMon = require(appDir + '/library/cryptoMon');
const scc = registry.get('scc');
const {'smart-contract-queries': queries, fee } = registry.get('consts');
const mutex = registry.get('mutex');

class Resolvers {

    static async send({ parameters: { contract_id, public_key, from, to, asset, amount, desc, data, forms } }, context){
        let { validators: scValidators, messages: scMessages } = context.MVS.get('smart-contract');
        let { messages: commonMessages } = context.MVS.get('common');
        let lock;
        try {
            lock = await mutex.lock('tx');
            let input = { public_key, from, to, asset, amount: amount.toString(), desc, data, forms };
            await scValidators.send.validate(input, { allowUnknown: true });

            if(public_key && addressFromPublicKey(public_key) !== from){
                return new Error(scMessages.badPublicKey);
            }

            let nonce = String(moment().utc().toDate().getTime());
            let msg = `${from}__${to}__${0 - Math.abs(amount)}__${asset}__${nonce}`;
            let sign = signing(env.SMART_CONTRACT_PRIVATE_KEY, msg);
            let balance = await model.getBalanceByAddressAndAsset(from, asset);
            let toWallet = await model.getWalletByAddress(to);
            let fromWallet = await model.getWalletByAddress(from);
            let isOwnerSelf = (
                (
                    toWallet && fromWallet
                )
                &&
                (
                    toWallet.account_id.toString() === fromWallet.account_id.toString()
                )
            );

            let assetDoc = await model.getAssetBySymbol(asset);
            if(!assetDoc){
                return new Error(scMessages.balanceInsufficient);
            }

            let assetBalance = await model.getBalanceByAddressAndAsset(assetDoc.genesis_wallet, asset);

            //kendi cüzdanına göndermiyorsa, balance, amount + fee den küçükse
            if(!isOwnerSelf && balance < Math.abs(amount) + assetDoc.fee){
                return new Error(scMessages.balanceInsufficient);
            }

            // kendi cüzdanına gönderiyorsa fee_from ve fee eşitse balance, amounttan küçükse
            if(isOwnerSelf && balance < Math.abs(amount)){
                return new Error(scMessages.balanceInsufficient);
            }

            // asset sahibinin MNT balance'ı yetersizse
            if(assetBalance < fee.mnt){
                return new Error(scMessages.assetBalanceInsufficient);
            }

            let cryptoMon = new CryptoMon(public_key);

            let tx = {
                type: -2,
                contract_id,
                from,
                to,
                fee_from: from,
                data: ( public_key && data ? cryptoMon.encrypt(JSON.stringify(data)) : null ),
                amount: 0 - Math.abs(amount),
                sign,
                asset,
                desc,
                fee: (isOwnerSelf ? 0 : assetDoc.fee),
                fee_asset: asset,
                nonce: nonce,
                confirm_rate: 0,
                action_time: Long.fromNumber(moment().utc().toDate().getTime()),
                complete_time: Long.fromNumber(moment().utc().toDate().getTime()),
                forms,
                contract_wallet: env.SMART_CONTRACT_WALLET_ADDRESS,
                public_key: env.SMART_CONTRACT_PUBLIC_KEY
            };

            let addedTx = await model.addTx(tx);
            if(!!toWallet && 'contract_id' in toWallet){
                await mutex.unlock(lock);
                let contract = await model.getContractById(toWallet.contract_id);
                if(!contract){
                    return await model.setTxType(addedTx._id, 0);
                }

                let params = {
                    tx: {
                        _id: addedTx._id.toString(),
                        from: addedTx.from,
                        to: addedTx.to,
                        hash: addedTx.hash,
                        amount: addedTx.amount,
                        asset: addedTx.asset,
                        nonce: addedTx.nonce,
                        forms: addedTx.forms,
                        public_key: public_key
                    },
                    owner_wallet: {
                        _id: toWallet._id.toString(),
                        account_id: toWallet.account_id.toString(),
                        address: toWallet.address,
                        contract_id: toWallet.contract_id.toString(),
                        smart_contract_code: contract.code.toString(),
                        wallet_data: toWallet.wallet_data
                    }
                };


                let sending = await stc(async () => await scc.mutation(queries.performSmartContract, params));
                if(sending instanceof Error){
                    return await model.setTxType(addedTx._id, 0);
                }
            }

            return  addedTx;

        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        } finally {
            await mutex.unlock(lock);
        }
    }

    static async approve({ tx_ids, public_key }){
        if(!Array.isArray(tx_ids)){
            return false;
        }

        let lock;
        try {
            lock = await mutex.lock('tx');
            return await model.approve(tx_ids, public_key);
        } catch (e) {
            throw e;
        } finally {
            await mutex.unlock(lock);
        }
    }

    static async cancel({ tx_ids, public_key }){
        if(!Array.isArray(tx_ids)){
            return false;
        }

        return await model.cancel(tx_ids, public_key);
    }

    static async createAsset({ info: { contract_id, hash, owner, wallet, supply, name, symbol, icon } }, context){
        let { validators: scValidators, messages: scMessages } = context.MVS.get('smart-contract');
        let { messages: commonMessages } = context.MVS.get('common');
        let lock;
        try {
            lock = await mutex.lock('tx');
            await scValidators.createAsset.validate({ hash, wallet, supply, name, symbol, icon });
            if(!await model.getAccountById(owner)){
                return new Error(scMessages.ownerIsNotExists);
            }

            await model.createAsset(contract_id, hash, owner, wallet, supply, name, symbol, icon);
            return true;
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        } finally {
            await mutex.unlock(lock);
        }
    }

    static async burnAsset({ public_key, owner, symbol, amount }, context){
        let { validators: scValidators, messages: scMessages } = context.MVS.get('smart-contract');
        let { messages: commonMessages} = context.MVS.get('common');
        let lock;
        try {
            lock = await mutex.lock('tx');
            await scValidators.burnAsset.validate({ public_key, symbol, amount });
            let address = addressFromPublicKey(public_key);
            let wallet = await model.getWalletByAddress(address);
            if(wallet.account_id.toString() !== owner.toString()){
                return new Error(scMessages.assetAuthFailed);
            }

            let asset = await model.getAssetByWalletAndSymbol(address, symbol);
            if(!asset){
                return new Error(scMessages.assetAuthFailed);
            }

            let balance = await model.getBalanceByAddressAndAsset(address, symbol);
            if(balance < amount){
                return true;
            }

            await model.burnAsset(address, symbol, amount);
            return true;
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        } finally {
            await mutex.unlock(lock);
        }
    }
}

module.exports = Resolvers;