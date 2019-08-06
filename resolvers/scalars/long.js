'use strict';

const { GraphQLScalarType } =  require('graphql');
const { Kind } = require('graphql/language');
const { Long } = require('mongodb');
const _ = require('lodash');

const config = {
    name: 'Long',
    description: 'Long Type',
    serialize: value => value.toString(),
    parseValue: value => {
        switch (true) {
            case (_.isInteger(value)):
            case (_.isNumber(value)):
                return Long.fromNumber(value);
                break;

            case(_.isString(value)):
                return Long.fromString(value);
                break;

            default:
                throw new Error('Long türü sadece float, string, yada int türünde olabilir');
                break;

        }
    },

    parseLiteral: (ast) => {
        switch(ast.kind){
            case Kind.INT:
            case Kind.FLOAT:
                return Long.fromNumber(ast.value);
            case Kind.STRING:
                return Long.fromString(ast.value);
                break;
            default:
                throw new Error('Long türü sadece float, string, yada int türünde olabilir');
                break;
        }
    }
};

module.exports = new GraphQLScalarType(config);