'use strict';

function generateCursorString(obj){
    return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function parseCursor(cursorString, orders){
    let cursor = {};
    if(cursorString){
        if(typeof cursorString === 'object'){
            cursor = cursorString;
        } else {
            cursor = JSON.parse(Buffer.from(cursorString, 'base64'));
        }

        for(let key in orders){
            if(cursor[key] === undefined){
                throw new Error('cursor içinde orders elemanları bulunmalı');
            }
        }
    }

    return cursor;
}


function findCastRule(castRules, column){
    if(!Array.isArray(castRules)){
        throw new Error('çeviri kuralları array olmalıdır');
    }

    let find = castRules.find(rule => rule.column === column);
    if(!find){
        return x => x;
    }

    return find.cast;
}


function checkRawOperator(filterObject, operators = []){
    let operatorsKey = Object.keys(filterObject);
    let isRaw = true;
    for(let operator of operators){
        if(operatorsKey.includes(operator) === true){
            isRaw = false;
            break;
        }
    }

    return isRaw;
}


function filterBuilder(rootArray, filter, fields, castRules){
    let tmp = [];
    let validOperators = ['eq', 'ne', 'in', 'notIn', 'gt', 'lt', 'gte', 'lte', 'search'];

    for(let key in filter){
        if(key === 'AND'){
            for(let subKey in filter[key]){
                tmp = [...tmp, ...(filterBuilder([], filter[key][subKey], fields))];
            }

            rootArray.push({ $and: tmp });
            continue;
        } else if (key === 'OR'){
            for(let subKey in filter[key]){
                tmp = [...tmp, ...filterBuilder([], filter[key][subKey], fields)];
            }

            rootArray.push({ $or: [ { $and: tmp } ] });
            continue;
        }

        if(typeof filter[key] !== 'object' || (typeof filter[key] === 'object' && checkRawOperator(filter[key], validOperators))){
            let casting = findCastRule(castRules, key);
            let value = casting(filter[key]);
            rootArray.push({ [key]: value });
            continue;
        }

        for (let operator in filter[key]){

            if(typeof fields[key] === 'function'){
                rootArray.push(fields[key](rootArray, operator, filter[key][operator]));
                continue;
            }

            let value = filter[key][operator];
            //let casting = findCastRule(castRules, key);
            //let value = casting(filter[key][operator]);

            switch (operator) {
                case 'eq':
                    rootArray.push({ [key]: { $eq: value } });
                    break;

                case 'ne':
                    rootArray.push({ [key]: { $ne: value } });
                    break;

                case 'in':
                    rootArray.push({ [key]: { $in: value } });
                    break;

                case 'notIn':
                    rootArray.push({ [key]: { $nin: value } });
                    break;
                // case 'search':
                //     rootArray.push({$text: {$search: value}});
                //     break;

                case 'gt':
                    rootArray.push({ [key]: { $gt: value } });
                    break;

                case 'gte':
                    rootArray.push({ [key]: { $gte: value } });
                    break;

                case 'lt':
                    rootArray.push({ [key]: { $lt: value } });
                    break;

                case 'lte':
                    rootArray.push({ [key]: { $lte: value } });
                    break;

                default:
                    rootArray.push({ [key]: value });
                    break;
            }
        }
    }

    return rootArray;
}


function orderBuilder(rootArray, orders, cursor, castRules, eq = true){
    let orderedKeys = Object.keys(orders);
    let sort = { };
    let or = [];
    let and = [];

    if(Object.keys(cursor).length > 0){
        rootArray.push({ $or: or });
        for(let key of orderedKeys){
            let keyIndex = orderedKeys.indexOf(key);
            let beforeKeys = orderedKeys.slice(0, keyIndex + 1);
            if(keyIndex === 0){
                if(cursor[key] !== undefined){
                    let bfkl = beforeKeys.length > 0;
                    let operator = orders[key] === 'ASC' ? (bfkl ? '$gt' : (eq ? '$gte' : '$gt')) : ( bfkl ? '$lt' : (eq ? '$lte': '$lt'));
                    let casting = findCastRule(castRules, key);
                    or.push({ [key]: { [operator] : casting(cursor[key]) } });
                }

                continue;
            }

            if(beforeKeys.length > 0){
                or.push({ $and: and });
                for (let beforeKey of beforeKeys){
                    let column = { };
                    let casting = findCastRule(castRules, beforeKey);
                    if(cursor[beforeKey] !== undefined){
                        if(key !== beforeKey){
                            column[beforeKey] = { $eq: casting(cursor[beforeKey]) };
                            and.push(column);
                            continue;
                        }

                        if(eq === true && orders[beforeKey] === 'ASC'){
                            column[beforeKey] = { $gte: casting(cursor[beforeKey]) };
                        } else if (eq === true && orders[beforeKey] === 'DESC'){
                            column[beforeKey] = { $lte: casting(cursor[beforeKey]) };
                        } else if(eq === false && orders[beforeKey] === 'ASC'){
                            column[beforeKey] = { $gt: casting(cursor[beforeKey]) };
                        } else {
                            column[beforeKey] = { $lt: casting(cursor[beforeKey]) };
                        }

                        and.push(column);
                    }
                }
            }

        }
    }

    for (let key of orderedKeys){
        if(typeof orders[key] === 'string'){
            sort[key] = (orders[key] === 'ASC' ? 1 : -1);
            continue;
        }

        sort[key] = (orders[key] === 1 ? 1 : -1);
    }

    return { cursorQuery: rootArray, sort };
}


function filtererAndSorter(filter, orders, cursorString, fields, castRules, eq = true){

    if(typeof filter !== 'object'){
        return { };
    }

    if(typeof fields !== 'object'){
        return { };
    }

    if(fields['filter'] === undefined){
        throw new Error('fields içinde filter adında alt obje bulunmalı');
    }

    let cursor = parseCursor(cursorString, orders);
    let filterQuery = filterBuilder([], filter, fields.filter, castRules);
    let { cursorQuery, sort } = orderBuilder([ ], orders, cursor, castRules, eq);
    return { filterQuery, cursorQuery, sort, cursor };

}

module.exports = {filtererAndSorter, orderBuilder, filterBuilder, generateCursorString, findCastRule, parseCursor};