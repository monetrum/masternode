'use strict';

const queries = {};
//----------------------------------------------------------------------------------------------------------------------

queries.performSmartContract = `
    mutation ( $tx: TxSmartContractTxInput!, $owner_wallet: TxSmartContractOwnerWalletInput! ) {
        performSmartContract(
           smart_contract: {
                tx: $tx,
                owner_wallet: $owner_wallet
            } 
        )
    }  
`;

module.exports = queries;
