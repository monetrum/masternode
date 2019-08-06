'use strict';
const model = require(appDir + '/models/workers/queue');
const { 'smart-contract-queries': queries, fee, 'tx-situations': txs } = registry.get('consts');
const scc = registry.get('scc');
const { stc, sleep } = registry.get('helpers');
const { Long } = require('mongodb');
const moment = require('moment');

class Queue {
    constructor(options){
        this.worker_id = parseInt(options.worker_id);
        this.mutex = options.mutex;
    }

    async processor(){
        for await (let tx of model.asyncTxIterator(this.worker_id)){
            // console.log('queue çalıştı');
            await sleep(5000);
            let lock = await this.mutex.lock('tx', 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
            try {
                let complete_time = Long.fromNumber(moment().utc().toDate().getTime());
                let fromWallet = await model.getWalletByAddress(tx.from);
                let balance = await model.getBalanceByAddressAndAsset(tx.from, tx.asset);
                let toWallet = await model.getWalletByAddress(tx.to);
                //let feeWallet = await model.getWalletByAddress(tx.fee_from);
                let assetDoc = await model.getAssetBySymbol(tx.asset);
                let feeBalance = balance;
                let isOwnerSelf = (
                    (
                        toWallet && fromWallet
                    )
                    &&
                    (
                        fromWallet.account_id.toString() === toWallet.account_id.toString()
                    )
                );

                if (!assetDoc) {
                    await model.set(tx._id, { type: 0, status: txs['asset-notfound'], complete_time });
                    continue;
                }

                let assetBalance = await model.getBalanceByAddressAndAsset(assetDoc.genesis_wallet, 'MNT');
                if (tx.fee_from !== tx.from) {
                    feeBalance = await model.getBalanceByAddressAndAsset(tx.fee_from, tx.asset);
                }

                // kendi cüzdanına göndermiyorsa, from ve fee_from aynı değilse ve feeBalance fee'den küçükse
                if (!isOwnerSelf && tx.fee_from !== tx.from && feeBalance < assetDoc.fee) {
                    await model.set(tx._id, { type: 0, status: txs['balance-insufficient'], complete_time });
                    continue;
                }

                //kendi cüzdanına göndermiyorsa fee_from ve from aynı ise, balance amount + fee den küçükse
                if (!isOwnerSelf && tx.fee_from === tx.from && balance < Math.abs(tx.amount) + assetDoc.fee) {
                    await model.set(tx._id, { type: 0, status: txs['balance-insufficient'], complete_time });
                    continue;
                }

                // kendi cüzdanına gönderiyorsa fee_from ve fee eşitse balance, amounttan küçükse
                if (isOwnerSelf && balance < Math.abs(tx.amount)) {
                    await model.set(tx._id, { type: 0, status: txs['balance-insufficient'], complete_time });
                    continue;
                }

                // asset sahibinin MNT balance'ı yetersizse
                if (assetBalance < fee.mnt) {
                    await model.set(tx._id, { type: 0, status: txs['asset-balance-insufficient'], complete_time });
                    continue;
                }

                if (!!toWallet && 'contract_id' in toWallet) {
                    await this.mutex.unlock(lock, 24 * 60 * 60 * 1000);
                    let contract = await model.getContractById(toWallet.contract_id);
                    if (!contract) {
                        await model.set(tx._id, { type: 0, status: txs['smart-contract-notfound'], complete_time });
                        continue;
                    }

                    await model.set(tx._id, { type: -2 });
                    let params = {
                        tx: {
                            _id: tx._id.toString(),
                            from: tx.from,
                            to: tx.to,
                            hash: tx.hash,
                            amount: Math.abs(tx.amount),
                            asset: tx.asset,
                            nonce: tx.nonce,
                            forms: tx.forms,
                            public_key: tx.public_key
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

                    let sending = await stc(() => scc.mutation(queries.performSmartContract, params));
                    if (sending instanceof Error) {
                        await model.set(tx._id, { type: 0, status: txs['smart-contract-did-not-allow'], complete_time });
                        continue;
                    }

                    continue;
                }

                await model.handle(tx);

            } catch (e) {
                console.log(e);
            } finally {
                await this.mutex.unlock(lock, 24 * 60 * 60 * 1000);
            }
        }
    }
}

module.exports = Queue;