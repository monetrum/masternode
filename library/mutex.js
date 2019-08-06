'use strict';
const mutex = require('mutex');

class Mutex {
    constructor(options){
        this.host = options.host;
        this.port = options.port;
        this.duration = options.duration;
        this.maxWait = options.maxWait;
        this.id = options.id;
        this.mutex = mutex({
            id: this.id,
            strategy: {
                name: 'redis',
                connectionString: `redis://${this.host}:${this.port}`
            }
        });
    }

    async lock(key, duration = undefined, maxWait = undefined){
        return await this.mutex.lock(key, { duration: duration || this.duration, maxWait: maxWait || this.maxWait });
    }

    async unlock(lock, maxWait = undefined){
        if (!!lock && lock.isValidForDuration(maxWait || this.maxWait)) {
            return await this.mutex.unlock(lock);
        }

        return true;
    }
}

module.exports = Mutex;