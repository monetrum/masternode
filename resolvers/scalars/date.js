'use strict';

const { GraphQLScalarType } =  require('graphql');
const moment = require('moment');

const config = {
    name: 'Date',
    description: 'Date type',
    serialize: value => moment(value).utc().format('YYYY-MM-DD'),
    parseValue: value => {
        if(!moment(value, 'YYYY-MM-DD', true).isValid()){
            throw new Error('Girilen veri tipi datetime ve YYYY-MM-DD formatında olmalıdır');
        }

        return moment(value, 'YYYY-MM-DD', true).toDate();
    },
    parseLiteral: (ast) => {
        if(!moment(ast.value, 'YYYY-MM-DD', true).isValid()){
            throw new Error('Girilen veri tipi datetime ve YYYY-MM-DD formatında olmalıdır');
        }

        return moment(ast.value, 'YYYY-MM-DD', true).toDate();
    }
};

module.exports = new GraphQLScalarType(config);