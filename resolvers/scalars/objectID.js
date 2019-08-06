'use strict';

const { GraphQLScalarType } =  require('graphql');
const {ObjectID} = require('mongodb');

const config = {
    name: 'ObjectID',
    description: 'ObjectID Type',
    serialize: value => value.toString(),
    parseValue: value => {
        if(!ObjectID.isValid(value)){
            throw new Error('Girilen veri tipi mongodb object türünde olmalıdır');
        }

        return ObjectID(value);
    },
    parseLiteral: ast => {
        if(!ObjectID.isValid(ast.value)){
            throw new Error('Girilen veri tipi mongodb object türünde olmalıdır');
        }

        return ObjectID(ast.value);
    }
};

module.exports = new GraphQLScalarType(config);