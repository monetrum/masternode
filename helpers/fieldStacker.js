'use strict';

function fieldStacker(fields, ...args) {
    let returning = {};
    if(typeof fields !== 'object'){
        throw new Error('sadece obje türü desteklenir');
    }

    for(let arg of args){
        if(!(typeof arg === 'object' && typeof arg.name === 'string' && Array.isArray(arg.fields))){
            throw new Error('verilen argümanlar {name: "adı", fields: ["field1", "field2"]} şeklinde olmalıdır');
        }
    }

    for (let key in fields){
        for (let arg of args){
            if(arg.fields.indexOf(key) !== -1){
                if(!returning[arg.name]){
                    returning[arg.name] = {};
                }

                returning[arg.name][key] = fields[key];
            }
        }
    }

    return returning;
}

module.exports = fieldStacker;