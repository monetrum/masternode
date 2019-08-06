'use strict';
const env = registry.get('env');
const GraphQLJSON = require('graphql-type-json');
const Datetime = require('./scalars/datetime');
//const Date = require('./scalars/date');
const ObjectID = require('./scalars/objectID');
const Long = require('./scalars/long');
const Binary = require('./scalars/binary');
const system = require('./system/index');
const auth = require('./auth/index');
const profile = require('./profile/index');
const tx = require('./tx/index');
const nodes = require('./nodes/index');
const smartContractPerform = require('./smart-contract/perform');
const smartContractCrud = require('./smart-contract/crud');
const wallet = require('./wallet/index');
const assets = require('./assets/index');
const { resolversHelpers: { checkLogin } } = registry.get('helpers');
const subscriptions = require('./subscriptions/index');

const resolvers = {

    //------------------------------------------------------------------------------------------------------------------
    Datetime,
    //Date,
    ObjectID,
    JSON: GraphQLJSON,
    Binary,
    Long,
    //------------------------------------------------------------------------------------------------------------------
    WalletPayload: {
        last5tx: wallet.last5tx,
        balances: wallet.balances
    },
    //------------------------------------------------------------------------------------------------------------------
    Query: {
        system: () => ({
            status: system.status
        }),

        test: () => ({
            ping: 'OK',
        }),

        auth: () => ({
            token: auth.token
        }),

        tx: () => ({
            getTxList: tx.getTxList,
            getTx: tx.getTx,
            lastSeq: tx.lastSeq
        }),

        wallet: () => ({
            getBalanceByWallet: wallet.getBalanceByWallet,
            getBalancesByAccount: wallet.getBalancesByAccount,
            getWallets: wallet.getWallets,
            getWallet: wallet.getWallet,
            getWalletInfo: wallet.getWalletInfo
        }),

        smartContractCrud: () => ({
            getContracts: smartContractCrud.getContracts,
            getContract: smartContractCrud.getContract,
            getContractByAddress: smartContractCrud.getContractByAddress
        }),

        smartContractInfo: () => ({
            address: env.SMART_CONTRACT_WALLET_ADDRESS,
            public_key: env.SMART_CONTRACT_PUBLIC_KEY
        }),

        assets: () => ({
            getAssets: assets.getAssets,
            getAsset: assets.getAsset
        }),

        nodes: () => ({
            getNodes: nodes.getNodes
        })
    },
    //------------------------------------------------------------------------------------------------------------------

    Mutation: {

        auth: () => ({
            register: auth.register,
            login: auth.login,
            forgotPassword: auth.forgotPassword,
            sendNewPassword: auth.sendNewPassword
        }),

        profile: (parent, args, context) => {
            checkLogin(context);
            return {
                changePassword: profile.changePassword
            }
        },

        wallet: () =>({
            generate: wallet.generate,
            update: wallet.update,
            save: wallet.save
        }),

        tx: () =>({
            send: tx.send,
            deleteTxData: tx.deleteTxData,
            updateConfirmRate: tx.updateConfirmRate
        }),

        smartContractPerform: (parent, args, context) => {
            if(!context.issc){
                throw new Error('only for smart contract');
            }

            return {
                send: smartContractPerform.send,
                approve: smartContractPerform.approve,
                cancel: smartContractPerform.cancel,
                createAsset: smartContractPerform.createAsset,
                burnAsset: smartContractPerform.burnAsset
            }
        },

        smartContractCrud: () => ({
            create: smartContractCrud.create
        }),

        nodes: () => ({
            addNode: nodes.addNode
        })
    },

    //------------------------------------------------------------------------------------------------------------------
    Subscription: subscriptions
    //------------------------------------------------------------------------------------------------------------------
};

module.exports = resolvers;
