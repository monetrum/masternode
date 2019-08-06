'use strict';

const pubsub = registry.get('pubsub');

class Resolvers {

    static async status(){
        return {
            status: 'Active',
            message: 'OK kanka açık'
        }
    }
}

Resolvers.subscriptionStatus = {
    subscribe: () => pubsub.asyncIterator('SYSTEM_STATUS')
};

/*
setTimeout(async () => {
    await pubsub.publish('SYSTEM_STATUS', {systemStatus:{ status: 'Active', message: 'sdadsfsdfsdfs'}});
}, 6000);
*/

module.exports = Resolvers;