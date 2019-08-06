'use strict';
/*
 *root klasörü globale atıyoruz böylece her modülden erişilebilir
 *registry set edilen değişkenlere erişimi sağlar
 */

global.appDir = __dirname;
global.registry = require('./core/registry');
require('./hooks/hooks');

//--------------------------------------------------------------------------------------------------------------------//
const env = require('dotenv').config().parsed;
const requireDir = require('require-dir');
const config = require(appDir + '/config/config');
const winston = require('winston');
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const http = require('http');
const { ApolloServer} = require('apollo-server-express');
const { importSchema } = require('graphql-import');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const GraphQLError = require('./library/graphQLError');
const cron = require('node-cron');
const GraphQLClient = require(__dirname + '/library/GraphQLClient');
const Mutex = require(appDir + '/library/mutex');
const timeout = require('connect-timeout');
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: __dirname + '/logs/combined.log' })
    ]
});

//----------------------------------------------------------------------------------------------------------------------
/*
 * formatError ürün canlıya alındığında hataların stacklerini siler
 */

function formatError(error) {
    if(env.MODE === 'production'){
        delete error.extensions.exception;
        return error;
    }

    return error;
}
//----------------------------------------------------------------------------------------------------------------------
function GraphQLErrorCallback(e){
    if(e.networkError) {
        e.networkError.result.errors.forEach((element) => {
            throw new GraphQLError(element.message);
        })
    }

    if(e.graphQLErrors.length > 0){
        e.graphQLErrors.forEach(element => {
            throw new GraphQLError(element.message);
        });
    }
}
//----------------------------------------------------------------------------------------------------------------------
/*
 * init fonksiyonu başlatıcı fonksiyondur
 */

async function init(){

    let mongoClient = await MongoClient.connect(
        env.DATABASE_CONNECTION_STRING,
        {
            useNewUrlParser: true,
            authSource: env.DATABASE_AUTH_SOURCE,
            replicaSet: env.DATABASE_RS,
            ssl: false,
            auth: {
                user: env.DATABASE_USER,
                password: env.DATABASE_PASS
            }
        }
    );

    let db = mongoClient.db(env.DATABASE);
    //------------------------------------------------------------------------------------------------------------------
    let pubsub = new RedisPubSub({
        connection: {
            host: env.REDIS_HOST,
            port: parseInt(env.REDIS_PORT),
            retry_strategy: options => Math.max(options.attempt * 100, 3000)
        }
    });

    //------------------------------------------------------------------------------------------------------------------

    let mutex = new Mutex({
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT),
        id: 'mutex',
        duration: 300 * 1000,
        maxWait: 300 * 1000
    });

    //------------------------------------------------------------------------------------------------------------------
    registry.set('workerId', parseInt(process.env.NODE_APP_INSTANCE || '0'));
    registry.set('pubsub', pubsub);
    registry.set('mongoClient', mongoClient);
    registry.set('db', db);
    registry.set('logger', logger);
    registry.set('config', config);
    registry.set('app', app);
    registry.set('env', env);
    registry.set('mutex', mutex);
    registry.set('helpers', requireDir(appDir + '/helpers', { recurse: true }));
    registry.set('consts', requireDir(appDir + '/consts', { recurse: true }));

    //------------------------------------------------------------------------------------------------------------------
    const { loader } = registry.get('helpers');
    //------------------------------------------------------------------------------------------------------------------

    const scc = new GraphQLClient(
        env.SMART_CONTRACT_SERVER_URI,
        false,
        {
            'X-CONTRACT-TOKEN': env.SMART_CONTRACT_SERVER_TOKEN
        }
    );

    scc.setErrorCallback(GraphQLErrorCallback);
    registry.set('scc', scc);

    //------------------------------------------------------------------------------------------------------------------
    const Queue = require('./workers/queue');
    (new Queue({ worker_id: parseInt(process.env.NODE_APP_INSTANCE || '0'), mutex })).processor();
    //------------------------------------------------------------------------------------------------------------------

    app.use(timeout('1d'));
    app.use((req, res, next) => {
        if (!req.timedout){
            next();
        }
    });

    //------------------------------------------------------------------------------------------------------------------
    (new loader(app, appDir + '/middlewares/app-level')).middlewares();
    (new loader(app, appDir + '/middlewares/router-level')).routers();
    (new loader(app, appDir + '/routes')).routers();
    //------------------------------------------------------------------------------------------------------------------

    const typeDefs = importSchema(__dirname + '/schemes/typeDefs.graphql');
    const resolvers = require(__dirname + '/resolvers/index');
    const context = require(__dirname + '/context/context');
    const subscriptions = require(__dirname + '/subscriptions/subscription');
    const apollo = new ApolloServer({ typeDefs, resolvers, formatError, context, subscriptions });
    const httpServer = http.createServer(app);
    //------------------------------------------------------------------------------------------------------------------
    apollo.applyMiddleware({ app, path: '/graphql', bodyParserConfig: { limit: '5mb' } });
    apollo.installSubscriptionHandlers(httpServer);
    // app.set('trust proxy', 1);
    //------------------------------------------------------------------------------------------------------------------
    const cronWorker = require('./workers/cronWorker');
    //1 1 */1 * * *
    let task = cron.schedule('1 1 */1 * * *', async () => {
        let lock = await mutex.lock('cron', 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
        await cronWorker();
        await mutex.unlock(lock);
    });

    task.start();
    //------------------------------------------------------------------------------------------------------------------
    httpServer.listen(parseInt(env.LISTEN_PORT), env.LISTEN_HOST);
    //------------------------------------------------------------------------------------------------------------------
    await scc.connect(100);
    //------------------------------------------------------------------------------------------------------------------
    return true;
}

init().then(() => logger.info(`${env.LISTEN_HOST}:${env.LISTEN_PORT} ip adresini dinliyor`));