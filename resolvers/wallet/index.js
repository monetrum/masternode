'use strict';

const model = require(appDir + '/models/wallet/wallet');
const logger = registry.get('logger');
const { ecdsa: { createWallet, addressFromPublicKey, publicKeyFromPrivateKey, verify} } = registry.get('helpers');
const { ObjectID } = require('mongodb');
const graphqlFields = require('graphql-fields');

class Resolvers {

    static async last5tx({ address }, args, context){
        return context.dataLoaders.last5tx.load(address);
    }

    static async balances({ address }, args, context){
        return context.dataLoaders.balances.load(address);
    }

    static async getWallets({ account_id, cursor }, context, info){
        if(!account_id && !context.user){
            return [];
        }

        return await model.getWallets(account_id || context.user._id, cursor, graphqlFields(info));
    }

    static async getWallet({ public_key, sign }, context){
        let { validators: walletValidators} = context.MVS.get('wallet');
        try {
            await walletValidators.getWallet.validate({ public_key, sign });
            let address = addressFromPublicKey(public_key);
            let wallet = await model.getWalletByAddress(address);

            if(!wallet){
                return null;
            }

            if(!verify(public_key, 'OK', sign)){
                return null;
            }

            return { ...wallet, address, public_key }
        } catch (e) {
            if(e.isJoi){
                return null
            }

            logger.error(e.message);
            return null;
        }
    }

    static async getWalletInfo({ private_key }, context){
        let { validators: walletValidators} = context.MVS.get('wallet');
        try {
            await walletValidators.getWalletInfo.validate(private_key);
            let public_key = publicKeyFromPrivateKey(private_key);
            let address = addressFromPublicKey(public_key);
            return {public_key, private_key, address};

        } catch (e) {
            if(e.isJoi){
                return null
            }

            logger.error(e.message);
            return null;
        }
    }

    static async getBalanceByWallet({ address, assets }, context){
        let { validators: walletValidators} = context.MVS.get('wallet');
        try {
            await walletValidators.getBalanceByWallet.validate({ address, assets });
            return await model.getWalletBalanceByAddressAndAssets(address, assets || []);
        } catch (e) {
            if(e.isJoi){
                return null;
            }

            logger.error(e.message);
            return null;
        }
    }

    static async getBalancesByAccount({ account_id, assets, cursor }, context, info){
        let { validators: walletValidators} = context.MVS.get('wallet');
        try {
            if(!context.user && !account_id){
                return null;
            }

            await walletValidators.getBalanceByAccount.validate(assets);
            return await model.getBalancesByAccountAndAssets(account_id || context.user._id , assets || [], cursor, graphqlFields(info));

        } catch (e) {
            logger.error(e.message);
            return null;
        }
    }

    static async generate({ account_id, contract_id, wallet_data }, context){
        let { messages: walletMessages, validators: walletValidators } = context.MVS.get('wallet');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await walletValidators.generate.validate(wallet_data, {allowUnknown: true});
            if(account_id){
                if(!ObjectID.isValid(account_id)){
                    return new Error(walletMessages.badAccountId);
                }
            }

            let wallet = createWallet();
            if(account_id || context.user){
                if(!await model.checkAccountById(account_id || context.user._id)){
                    return new Error(walletMessages.badAccountId);
                }

                await model.save(account_id || context.user._id, wallet.address, contract_id, wallet_data);
            }

            return {
                contract_id,
                private_key: wallet.privateKey,
                public_key: wallet.publicKey,
                address: wallet.address
            }

        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    static async save({ account_id, contract_id, public_key, address, wallet_data }, context){
        let { messages: walletMessages, validators: walletValidators } = context.MVS.get('wallet');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await walletValidators.save.validate({public_key, address, wallet_data}, {allowUnknown: true});
            if(!account_id && !context.user){
                return new Error(walletMessages.badAccountId);
            }

            if(account_id){
                if(!ObjectID.isValid(account_id)){
                    return new Error(walletMessages.badAccountId);
                }
            }

            if(!await model.checkAccountById(account_id || context.user._id)){
                return new Error(walletMessages.badAccountId);
            }

            if(contract_id){
                if(!await model.checkSmartContract(account_id || context.user._id, contract_id)){
                    return new Error(walletMessages.smartContractExists);
                }
            }

            if(address !== addressFromPublicKey(public_key)){
                return new Error(walletMessages.badPublicKey);
            }

            await model.save(account_id || context.user._id, address, contract_id, wallet_data);

            return {
                account_id: account_id || context.user._id,
                contract_id,
                public_key,
                address,
                wallet_data
            }

        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            if(e.name === 'MongoError' && e.code === 11000){
                return new Error(walletMessages.addressExists);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }


    static async update({ public_key, sign, contract_id, wallet_data }, context){
        let { messages: walletMessages, validators: walletValidators } = context.MVS.get('wallet');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await walletValidators.update.validate({ public_key, sign, wallet_data }, { allowUnknown: true });
            let address = addressFromPublicKey(public_key);
            let wallet = await model.getWalletByAddress(address);

            if(!wallet){
                return new Error(walletMessages.badPublicKey);
            }

            if(!verify(public_key, 'OK', sign)){
                return new Error(walletMessages.badSign);
            }

            await model.update(address, contract_id, wallet_data, wallet.wallet_data);

            return {
                contract_id,
                asset: wallet.asset,
                public_key,
                address,
                wallet_data
            }

        } catch (e) {

            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }
}

module.exports = Resolvers;