'use strict';
const { GraphQLScalarType } =  require('graphql');
const moment = require('moment');

const config = {
    name: 'Datetime',
    description: 'Datetime type',

    serialize: value => moment(value).utc().format('YYYY-MM-DD HH:mm:ss'),
    parseValue: value => {
        if(!moment(value, 'YYYY-MM-DD HH:mm:ss', true).isValid()){
            throw new Error(' Girilen veri tipi datetime ve YYYY-MM-DD HH:smm:ss formatında olmalıdır');
        }

        return moment(value, 'YYYY-MM-DD HH:mm:ss', true).toDate();
    },
    parseLiteral: (ast) => {
        if(!moment(ast.value, 'YYYY-MM-DD HH:mm:ss', true).isValid()){
            throw new Error(' Girilen veri tipi datetime ve YYYY-MM-DD HH:smm:ss formatında olmalıdır');
        }

        return moment(ast.value, 'YYYY-MM-DD HH:mm:ss', true).toDate();
    }
};

module.exports = new GraphQLScalarType(config);