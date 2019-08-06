'use strict';
const scfee = require(appDir + '/consts/smart-contract-fee');
const fee = require(appDir + '/consts/fee');
const smartContractTx = require('./restrictiveCheckerLibs/smartContractTx');
const tx = {
    _id : '5c73fd9f8d813e4c835b2e48',
    from : '90x1F2WYHPTZFWAVCNR42AAVYBETVPGDNST3K',
    to : '90x1HVAJRIZCWSLORDGUOPWHIM6TG62BQRWGX',
    fee_from : '90x1F2WYHPTZFWAVCNR42AAVYBETVPGDNST3K',
    data : {},
    amount : 100.01,
    asset : 'MNT',
    desc : 'example',
    fee : 50.02,
    fee_asset : 'MNT',
    nonce : '665563633232',
    confirm_rate : 0,
    action_time : 1551105439898,
    complete_time : 1551105439978,
    seq : 2,
    prev_hash : '73f347c0d0f96ee4918bc6faead54b22a8566dd8fef740509734f199776fe73f',
    hash : '73f347c0d0f96ee4918bc6faead54b22a8566dd8fef740509734f199776fe73f',
    public_key: 'sadfdsfsdfsdfsdfsdfsdfsdf',
    forms: {

    }
};

const owner_wallet = {
    _id: '5c6164509d29991e92500ad1',
    account_id: '5c70031b2484c3383f403ce0',
    asset: 'MNT',
    address: '90x1HVAJRIZCWSLORDGUOPWHIM6TG62BQRWGX',
    insert_time: 1549886544502,
    wallet_data: {

    }
};

const smart = new smartContractTx(tx, owner_wallet);

class SyntaxError extends Error {

    constructor(message, code = 0){
        super(message);
        this.name = this.constructor.name;
        this.isSyntaxError = true;
        this.code = code;

        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

const blackList = [
    {
        regex: /(for|while|do|try)\s*[({]/ig,
        message: new SyntaxError('for, while, do-while, try-catch kullanamazsınız')
    },
    {
        regex: /var\s+[a-zA-Z0-9_]+\s*=/ig,
        message: new SyntaxError('var yerine let kullanmalısınız')
    },
    {
        regex: /function\s*[a-zA-Z0-9_]*\s*\(/ig,
        message: new SyntaxError('function tanımlayamazsınız arrow fonksiyon kullanabilirsiniz')
    },
    {
        regex: /import\s+[a-zA-Z0-9_\-/.]+/ig,
        message: new SyntaxError('import kullanamazsınız')
    },
    {
        regex: /require\s*[(]/ig,
        message: new SyntaxError('require kullanamazsınız')
    },
    {
        regex: /console\./ig,
        message: new SyntaxError('console kullanamazsınız')
    },
    {
        regex: /syntaxChecker/ig,
        message: new SyntaxError('syntaxChecker kullanamazsınız')
    },
    {
        regex: /restrictiveChecker/ig,
        message: new SyntaxError('restrictiveChecker kullanamazsınız')
    },
    {
        regex: /registry/ig,
        message: new SyntaxError('registry kullanamazsınız')
    },
    {
        regex: /module\./ig,
        message: new SyntaxError('module kullanamazsınız')
    },
    {
        regex: /return/ig,
        message: new SyntaxError('return kullanamazsınız')
    }
];

function findForms(str){
    let find  = /(?:let|const|var)\s*forms\s*=\s*\[/i.exec(str);
    if(!find){
        return [];
    }

    let startPos = find.index;
    let openBrackedRegex = /\[/ig;
    let closeBrackedRegex = /\]/ig;
    let openIndexes = [];
    let closeIndexes = [];
    let openNum = 0;
    let closeNum = 0;
    let close = null;
    let open = null;

    while(open = openBrackedRegex.exec(str)){
        openNum++;
        openIndexes.push(open.index);
    }

    while(close = closeBrackedRegex.exec(str)){
        closeNum++;
        closeIndexes.push(close.index);
    }

    if(openNum !== closeNum){
        return [];
    }

    let openIndex = openIndexes.indexOf(startPos + find[0].length - 1);
    let closeIndex = openIndexes.length - 1 - openIndex;
    return eval(str.substring(openIndexes[openIndex], closeIndexes[closeIndex] + 1));
}

async function syntaxChecker(code){
     try {
         return await (eval(`module.exports = async () => { ${code} };`))();
     } catch (e) {
        throw new SyntaxError('akıllı sözleşmede syntax hatası ' + e.message);
     }
}


async function restrictiveChecker(code){

    for(let b of blackList){
        if(b.regex.test(code)){
            throw b.message;
        }
    }

    let counter = [];
    let total;
    let funcRegex = /\.(send|getBalance|connect|createAsset|burnAsset|setData|setError)/ig;
    let funcCounter = 0;
    let fmatch;
    while(fmatch = funcRegex.exec(code)){
        let index = counter.findIndex(x => x.name === fmatch[0]);
        if(index !== -1){
            counter[index].count++;
            funcCounter++;
            continue;
        }

        counter.push({ name: fmatch[0], count: 1 });
        funcCounter++;
    }

    total = counter.map(x => x.count * scfee[x.name] * fee.mnt).reduce((acc, value) => acc + value, 0);

    let awaitRegex = /await/ig;
    let awaitCounter = 0;
    let amatch;
    while(amatch = awaitRegex.exec(code)){
        awaitCounter++
    }

    if(awaitCounter !== funcCounter){
        throw new SyntaxError('Kullandığınız fonksiyonlarda await kullanmalısınız');
    }

    let forms = findForms(code);
    for(let input of forms){
        tx.forms[input.name] = 'xxxxxx';
    }

    await syntaxChecker(code);

    if(forms.length > 0){
        for(let input of forms){
            if(typeof input !== 'object'){
                throw new SyntaxError('forms elemanları obje olmalıdır');
            }

            if(!('name' in input)){
                throw new SyntaxError('inputun "name" alanı olmalıdır');
            }

            if(!/[a-zA-Z_]+/i.test(input.name)){
                throw new SyntaxError('inputun "name" alanı a - z arasında olmalıdır');
            }
        }
    }

    return total;
}


module.exports = restrictiveChecker;