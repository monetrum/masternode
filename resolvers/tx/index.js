'use strict';
const model = require(appDir + '/models/tx/tx');
const { ecdsa } = registry.get('helpers');
const logger = registry.get('logger');
const { addressFromPublicKey, publicKeyFromPrivateKey, verify, signing } = ecdsa;
const moment = require('moment');
const { Long } = require('mongodb');
const CryptoMon = require(appDir + '/library/cryptoMon');
const { fee } = registry.get('consts');
const mutex = registry.get('mutex');
const workerId = registry.get('workerId');
const graphqlFields = require('graphql-fields');

class Resolvers {

    static async lastSeq(){
        return await model.lastSeq();
    }

    static async getTxList({ filters, sorting, cursor, limit }, context, info){
        // console.log(JSON.stringify(graphqlFields(info), null, 4));
        let account_id;
        if(filters.account_id){
            account_id = filters.account_id;
        }

        if(context.user){
            account_id = context.user._id;
        }

        return await model.getTxList(account_id, filters, sorting, cursor, limit, graphqlFields(info));
    }

    static async getTx({ filters }){
        return await model.getTx(filters);
    }

    static async send({ parameters }, context){
        let { validators: txValidators, messages: txMessages } = context.MVS.get('tx');
        let { messages: commonMessages } = context.MVS.get('common');
        let lock;
        try {
            // console.log('send çalıştı');
            lock = await mutex.lock('tx');
            await txValidators.send.validate({ ...parameters, amount: parameters.amount.toString() }, { allowUnknown: true });
            let { sign, public_key, private_key } = parameters.keys;
            let { from, to, amount, asset, nonce, fee_from, desc, data, forms } = parameters;
            let msg = `${from}__${to}__${0 - Math.abs(amount)}__${asset}__${nonce}`;
            //----------------------------------------------------------------------------------------------------------
            if(private_key){
                public_key = publicKeyFromPrivateKey(private_key);
                from = addressFromPublicKey(public_key);
                if(from !== parameters.from){
                    return new Error(txMessages.walletNotFound);
                }

                sign = signing(private_key, msg);
            }

            //----------------------------------------------------------------------------------------------------------
            if(public_key){
                from = addressFromPublicKey(public_key);
                if(from !== parameters.from){
                    return new Error(txMessages.walletNotFound);
                }

                if(!verify(public_key, msg, sign)){
                    return new Error(txMessages.badSignature);
                }
            }

            let feeAddress = addressFromPublicKey(fee_from || public_key);
            let assetDoc = await model.getAssetBySymbol(asset);
            let fromWallet = await model.getWalletByAddress(from);
            let toWallet = await model.getWalletByAddress(to);
            let feeWallet = await model.getWalletByAddress(feeAddress || from);
            let isOwnerSelf = (
                (
                    toWallet && fromWallet
                )
                &&
                (
                    fromWallet.account_id.toString() === toWallet.account_id.toString()
                )
            );

            if(fee_from){
                let cond = (
                    (
                        !fromWallet || !feeWallet
                    )
                    &&
                    (
                        fromWallet && feeWallet
                        &&
                        fromWallet.account_id.toString() !== feeWallet.account_id.toString()
                    )
                );

                if(cond){
                    return new Error(messages.feeFromWalletNotFound);
                }
            }

            let cryptoMon = new CryptoMon(public_key);
            let tx = {
                worker_id: workerId,
                type: -1,
                from,
                to,
                fee_from: feeAddress || from,
                data: ( data ? cryptoMon.encrypt(JSON.stringify(data)) : null ),
                amount: 0 - Math.abs(amount),
                sign,
                asset,
                desc,
                fee: ( isOwnerSelf ? 0 : assetDoc.fee),
                fee_asset: asset,
                nonce,
                confirm_rate: 0,
                action_time: Long.fromNumber(moment().utc().toDate().getTime()),
                complete_time: 0,
                forms,
                public_key
            };

            return await model.addTx(tx);
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            console.log(e);
            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        } finally {
            await mutex.unlock(lock);
        }
    }
    
    static async deleteTxData({ hash, public_key }, context){
        let { validators: txValidators, messages: txMessages } = context.MVS.get('tx');
        let { messages: commonMessages } = context.MVS.get('common');
        
        try {
            await txValidators.deleteTxData.validate({ hash, public_key });
            let address = addressFromPublicKey(public_key);
            let tx = await model.getTxByHash(hash);

            if(!tx){
                return true;
            }

            if(tx.from !== address){
                return new Error(txMessages.invalidPublicKey);
            }

            await model.deleteTxData(hash);
            return true;
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    static async updateConfirmRate({ seq }, context){
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await model.updateConfirmRate(seq);
            return true;
        } catch (e) {

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }
}

module.exports = Resolvers;