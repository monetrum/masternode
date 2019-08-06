'use strict';

const { GraphQLScalarType } =  require('graphql');
const { Binary } = require('mongodb');

const config = {
    name: 'Binary',
    description: 'Binary Type',
    serialize: value => {
        if(typeof value === 'string'){
            return Buffer.from(value, 'base64').toString('utf8');
        }

        return value.toString();
    },
    parseValue: value => Binary(Buffer.from(value, 'utf8')),
    parseLiteral: ast => Binary(Buffer.from(ast.value, 'utf8'))
};

module.exports = new GraphQLScalarType(config);