'use strict';
const _ = require('lodash');
const findOperator    = ['$gt', '$lt', '$gte', '$lte', '$in'];
const replaceOperator = ['$lt', '$gt', '$lte', '$gte', '$nin'];

//----------------------------------------------------------------------------------------------------------------------

function reverseQuery(query){
    let clone = _.cloneDeep(query);
    if(Array.isArray(clone)){
        for(let key in clone){
            clone[key] = reverseQuery(clone[key]);
        }
    } else if(typeof clone === 'object'){
        for(let key in clone){
            let index = findOperator.indexOf(key);
            let tmp;
            if(index !== -1){
                tmp = _.cloneDeep(clone[key]);
                delete clone[key];
                clone[replaceOperator[index]] = tmp;
                continue;
            }

            clone[key] = reverseQuery(clone[key]);
        }
    }

    return clone;
}

//----------------------------------------------------------------------------------------------------------------------

function reverseSort(sort){
    let clone = _.cloneDeep(sort);
    if(typeof clone !== 'object'){
        throw new Error('sort Obje olmalıdır');
    }

    for(let key in clone){
        if(typeof clone[key] === 'string'){
            clone[key] = (clone[key] === 'ASC' ? -1 : 1);
            continue;
        }

        clone[key] = (clone[key] === 1 ? -1 : 1);
    }

    return clone;
}


module.exports = { reverseQuery, reverseSort };

