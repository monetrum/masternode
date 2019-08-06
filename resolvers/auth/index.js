'use strict';
const logger = registry.get('logger');
const model = require(appDir + '/models/auth/auth');
const uuid = require('uuid');
const sha256 = require('sha256');
const {renderMailBody, sendMail, passwordGenerator} = registry.get('helpers');
const env = registry.get('env');
const moment = require('moment');

class Resolvers {


    static async token({ token }){
        return await model.getToken(token);
    }

    static async register({ email, password }, context){
        let { messages: authMessages, validators: authValidators } = context.MVS.get('auth');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await authValidators.register.validate({ email, password });
            let _id = await model.register(email, password);
            return { _id, email, password }
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            if(e.name === 'MongoError' && e.code === 11000){
                return new Error(authMessages.emailAlreadyExists);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    static async login({ email, password }, context){
        let { messages: authMessages, validators: authValidators } = context.MVS.get('auth');
        let { messages: commonMessages } = context.MVS.get('common');
        let token = uuid();
        let isSha = /[0-9A-Fa-f]{20,64}/g.test(password);

        try {
            await authValidators.login.validate({ email, password });
            let account = await model.getAccountByEmail(email);

            if(!account){
                return new Error(authMessages.accountNotFound);
            }

            if(isSha && password !== account.password){
                return new Error(authMessages.invalidPassword);
            }

            if(!isSha && sha256(password) !== account.password){
                return new Error(authMessages.invalidPassword);
            }

            await model.addToken(account._id, token);
            return { _id: account._id, token };
        } catch (e) {

            if(e.isJoi){
                return new Error(e.message);
            }

            if(e.name === 'MongoError' && e.code === 11000){
                return new Error(authMessages.canNotCreateToken);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }

    static async forgotPassword({ email }, context){
        let { messages: authMessages, validators: authValidators } = context.MVS.get('auth');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await authValidators.forgotPassword.validate(email);
            let account = await model.getAccountByEmail(email);

            if(!account){
                return new Error(authMessages.accountNotFound);
            }

            let data = await model.addForgotPasswordCode(account._id);
            let mailBody = await renderMailBody(context.req.lang, 'forgot-password.ejs', { code: data.code });
            let sending = await sendMail(
                env.MAIL_SENDER_NAME,
                env.MAIL_SENDER_EMAIL,
                `<${account.email}>`,
                authMessages.forgotPasswordEmailTitle,
                mailBody
            );

            if(!sending){
                return new Error(commonMessages.canNotSendEmail);
            }

            return {
                expiry_time: data.expiry_time,
                account_id: data.account_id,
                created_at: moment().utc().toDate()
            };
        } catch (e) {
            if(e.isJoi){
                return new Error(e.message);
            }

            logger.error(e.message);
            throw new Error(commonMessages.serverError);
        }
    }


    static async sendNewPassword({ code }, context){
        let { messages: authMessages, validators: authValidators } = context.MVS.get('auth');
        let { messages: commonMessages } = context.MVS.get('common');
        let password = passwordGenerator();

        try {
            await authValidators.sendNewPassword.validate(code);
            let changeCode = await model.getChangePaswordCodeByCode(code);
            if(!changeCode){
                return new Error(authMessages.badVerificationCode);
            }

            let account = await model.getAccountById(changeCode.account_id);
            if(!account){
                return new Error(authMessages.accountNotFound);
            }

            let mailBody = await renderMailBody(context.req.lang, 'new-password.ejs', { password });
            let sending = await sendMail(
                env.MAIL_SENDER_NAME,
                env.MAIL_SENDER_EMAIL,
                `<${account.email}>`,
                authMessages.newPasswordEmailTitle,
                mailBody
            );

            if(!sending){
                return new Error(commonMessages.canNotSendEmail);
            }

            await model.changePassword(changeCode._id, changeCode.account_id, password);
            return true;
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