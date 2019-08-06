'use strict';
const model = require(appDir + '/models/smart-contract/crud');
const logger = registry.get('logger');
const { restrictiveChecker } = registry.get('helpers');

class Crud {

    static async getContracts({ filters, sorting, cursor }){
        return await model.getContracts(filters, sorting, cursor);
    }

    static async getContract({ contract_id, account_id }, context){
        if(!account_id && !context.user){
            return null;
        }

        return await model.getContract(contract_id, account_id || context.user._id);
    }

    static async getContractByAddress({ address }, context){
        let { validators: scValidators } = context.MVS.get('smart-contract');

        try {
            await scValidators.getContractByAddress.validate(address);
            return await model.getContractByAddress(address);
        } catch (e) {
            if(e.isJoi){
                return null;
            }

            logger.error(e.message);
            return null;
        }
    }

    static async create({ parameters: { account_id, name, code, desc, detail, image, is_private } }, context){
        let { validators: scValidators, messages: scMessages } = context.MVS.get('smart-contract');
        let { messages: commonMessages } = context.MVS.get('common');

        try {

            await scValidators.create.validate({ name, code, desc, detail, image });
            if(account_id){
                if(!await model.getAccountById(account_id)){
                    return new Error(scMessages.badAccountId);
                }
            }

            if(!account_id && !context.user){
                return new Error(scMessages.badAccountId);
            }

            await restrictiveChecker(code);
            return await model.create(account_id || context.user._id, name, code, desc, detail, image, is_private);

        } catch (e) {
            if(e.isJoi || e.isSyntaxError){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    static async delete({ account_id,  contract_id }, context){
        let { messages: scMessages } = context.MVS.get('smart-contract');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            if(await model.checkInContractTx(contract_id)){
                return new Error(scMessages.checkInContractTx);
            }

        } catch (e) {
            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    // static async update({contract_id, account_id, name, code}, context){
    //     let {validators: scValidators, messages: scMessages} = context.MVS.get('smart-contract');
    //     let {messages: commonMessages} = context.MVS.get('common');
    //
    //     try {
    //
    //         await scValidators.update.validate({name, code});
    //         await restrictiveChecker(code);
    //
    //         if(account_id){
    //             if(!ObjectID.isValid(account_id)){
    //                 return new Error(scMessages.badAccountId);
    //             }
    //
    //             if(!await model.getAccountById(account_id)){
    //                 return new Error(scMessages.badAccountId);
    //             }
    //         }
    //
    //         if(!account_id && !context.user){
    //             return new Error(scMessages.badAccountId);
    //         }
    //
    //         return await model.update(contract_id, account_id || context.user._id, name, code);
    //
    //     } catch (e) {
    //         if(e.isJoi || e.isSyntaxError){
    //             return new Error(e.message);
    //         }
    //
    //         logger.error(e.message);
    //         throw new Error(commonMessages.serverError);
    //     }
    // }
}

module.exports = Crud;