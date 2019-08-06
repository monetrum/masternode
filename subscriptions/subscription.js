'use strict';

// const model = require(appDir + '/models/context/context');
// const { MVS } = registry.get('helpers');

const subscription = {};
// const languages = ['tr', 'en'];
// //----------------------------------------------------------------------------------------------------------------------
//
// function languageSelector(contentLang) {
//     if(!contentLang){
//         return 'tr';
//     }
//
//     let parsedLang = String(contentLang.split('-')[0]);
//     if(languages.indexOf(parsedLang) === -1){
//         return 'tr';
//     }
//
//     return parsedLang.toLowerCase();
// }

subscription.onConnect = async (params, webSocket, context) => {
    console.log(context.request.connection.remoteAddress);
    //webSocket.close();
    let data = {};

    // data.user = undefined;
    // if(params['X-TOKEN'] !== undefined){
    //     let userAndToken = await model.getUser(params['X-TOKEN']);
    //     if(userAndToken){
    //         data.user = userAndToken.user;
    //         data.token = userAndToken.token;
    //     }
    // }
    //
    // //------------------------------------------------------------------------------------------------------------------
    // data.params = params;
    // //------------------------------------------------------------------------------------------------------------------
    // data.lang = languageSelector(params['Content-Language']);
    // //------------------------------------------------------------------------------------------------------------------
    // data.MVS = new MVS(params['lang']);
    // //------------------------------------------------------------------------------------------------------------------

    return data;
};


// subscription.onDisconnect = async (websocket, context) => {
//
// };
//----------------------------------------------------------------------------------------------------------------------
module.exports = subscription;