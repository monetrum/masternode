'use strict';
const { withFilter } = require('apollo-server-express');
const pubsub = registry.get('pubsub');
const Resolvers = {};
//----------------------------------------------------------------------------------------------------------------------
Resolvers.tx = {
    subscribe: withFilter(
        () => pubsub.asyncIterator('TX_ADDED'),
        (payload, variables) => {
            if(!('from' in variables)){
                return true;
            }

            return !!payload.tx.find(p => variables.from.indexOf(p.from) !== -1 || variables.from.indexOf(p.to) !== -1);
        }
    )
};

Resolvers.wallet = {
    subscribe: () => pubsub.asyncIterator('WALLET_ADDED')
};

Resolvers.account = {
    subscribe: () => pubsub.asyncIterator('ACCOUNT_ADDED')
};

Resolvers.asset = {
    subscribe: () => pubsub.asyncIterator('ASSET_ADDED')
};

Resolvers.contract = {
    subscribe: () => pubsub.asyncIterator('CONTRACT_ADDED')
};

Resolvers.token = {
    subscribe: () => pubsub.asyncIterator('TOKEN_ADDED')
};

Resolvers.vc = {
    subscribe: () => pubsub.asyncIterator('VC_ADDED')
};
module.exports = Resolvers;