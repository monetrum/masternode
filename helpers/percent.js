'use strict';

function percent(dividing, divided){
    if(divided !== 0 && dividing !== 0){
        return Math.round((divided * 100 / dividing) * 100) / 100;
    }

    return 0;
}

module.exports = percent;