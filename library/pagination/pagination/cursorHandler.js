'use strict';

class CursorHandler {

    constructor(pagination, params){
        if(new.target === CursorHandler){
            throw new Error('CursorHandler classı extend edilmelidir');
        }

        if(!(pagination instanceof this.types.Pagination)){
            throw new Error('pagination parametresi Pagination sınıfı türevi olmalıdır');
        }

        this.pagination = pagination;
        this.params = params;
    }

    static setTypes(types){
        this.prototype.types = types;
    }

    async first(pNum){
        throw new Error('first fonksiyonunu ezmelisiniz');
    }

    async prev(pNum){
        throw new Error('prev fonksiyonunu ezmelisiniz');
    }

    async prevSeq(pNum){
        throw new Error('prevSeq fonksiyonunu ezmelisiniz');
    }

    async current(pNum){
        throw new Error('current fonksiyonunu ezmelisiniz');
    }

    async nextSeq(pNum){
        throw new Error('nextSeq fonksiyonunu ezmelisiniz');
    }

    async next(pNum){
        throw new Error('next fonksiyonunu ezmelisiniz');
    }

    async last(pNum){
        throw new Error('last fonksiyonunu ezmelisiniz');
    }
}

module.exports = CursorHandler;