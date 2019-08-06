'use strict';

const logger = registry.get('logger');
const model = require(appDir + '/models/profile/profile');
const sha256 = require('sha256');

class Resolvers {

    static async changePassword({ old_password, new_password }, context){
        let { messages: profileMessages, validators: profileValidators } = context.MVS.get('profile');
        let { messages: commonMessages } = context.MVS.get('common');

        try {
            await profileValidators.changePassword.validate({ old_password, new_password });
            let isShaOldPassword = /[0-9A-Fa-f]{20,64}/g.test(old_password);
            if(isShaOldPassword && context.user.password !== old_password){
                return new Error(profileMessages.invalidOldPassword);
            }

            if(!isShaOldPassword && context.user.password !== sha256(old_password)){
                return new Error(profileMessages.invalidOldPassword);
            }

            await model.changePassword(context.user._id, new_password);
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