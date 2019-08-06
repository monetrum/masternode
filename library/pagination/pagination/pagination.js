'use strict';

class Pagination {

    constructor(){

        this.pageLength = 5;
        this.currentPage = 0;
        this.limit = 0;
        this.totalRow = 0;
        this.startRow = 0;
        this.lastP = 0;
        this.cursorObj = {};
        this.cursorStr = '';
        this.cursorHandler = {};
    }

    static genCursorString(obj){
        return Buffer.from(JSON.stringify(obj)).toString('base64');
    }

    static setTypes(types){
        this.prototype.types = types;
    }

    setPageLength(length){
        this.pageLength = parseInt(length);
    }

    setTotalRow(total){
        total = parseInt(total);
        if(isNaN(total)){
            total = 0;
        }

        this.totalRow = total;
    }

    getTotalRow(){
        return this.totalRow;
    }

    getStartRow(){
        return this.startRow;
    }

    getLimit() {
        return this.limit;
    }

    setCurrentPage(page){
        page = parseInt(page);
        if(isNaN(page)){
            page = 0;
        }

        this.currentPage = page;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    setLimit(limit){
        limit = parseInt(limit);
        if(isNaN(limit)){
            limit = 10;
        }

        this.limit = limit;
    }

    getLastP(){
        return this.lastP;
    }

    setCursorHandler(cHandler){
        if(!(cHandler instanceof this.types.CursorHandler)){
            throw new Error('Cursor Handler bir "CursorHandler" türevi olmalıdır');
        }

        this.cursorHandler = cHandler;
    }

    setCursor(cursorStr){
        this.cursorStr = cursorStr;
        if(cursorStr.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/g) == null){
            throw new Error('cursor doğru formatta değil');
        }

        let decode = Buffer.from(cursorStr, 'base64').toString('utf8');
        this.cursorObj = JSON.parse(decode);
    }

    getCursor(){
        return this.cursorObj;
    }

    init(){
        this.lastP = Math.ceil(this.totalRow / this.limit);
        if(this.currentPage < 1){
            this.currentPage = 1;
        } else if (this.currentPage > this.lastP){
            this.currentPage = this.lastP;
        }
    }

    async smartRender(){

        let pages = [];

        if(this.totalRow > this.limit && this.currentPage > 0 && this.currentPage <= this.lastP ){
            if(this.currentPage > 1){
                pages.push({
                    name: 'FIRST',
                    value: 1,
                    current: false,
                    cursor: typeof this.cursorHandler.first === 'function' ? await this.cursorHandler.first(1) : {}
                });

                pages.push({
                    name: 'PREV',
                    value: this.currentPage - 1,
                    current: false,
                    cursor: typeof this.cursorHandler.prev === 'function' ? await this.cursorHandler.prev(this.currentPage - 1) : {}
                });
            }

            let prevPages = [];

            for(let prev = this.currentPage - 1; prev >=  (this.currentPage - this.pageLength <= 0 ? 1 : this.currentPage - this.pageLength); prev--){
                prevPages.push({
                    name: prev,
                    value: prev,
                    current: false,
                    cursor: typeof this.cursorHandler.prevSeq === 'function' ? await this.cursorHandler.prevSeq(prev) : {}
                });
            }

            prevPages.reverse();
            pages = [...pages, ...prevPages];

            pages.push({
                name: this.currentPage,
                value: this.currentPage,
                current: true,
                cursor: typeof this.cursorHandler.current === 'function' ? await this.cursorHandler.current(this.currentPage) : {}
            });

            for(let next = this.currentPage + 1; next <= this.currentPage + this.pageLength && next <= this.lastP; next++){
                pages.push({
                    name: next,
                    value: next,
                    current: false,
                    cursor: typeof this.cursorHandler.nextSeq === 'function' ? await this.cursorHandler.nextSeq(next) : {}
                });
            }

            if(this.currentPage < this.lastP){
                pages.push({
                    name: 'NEXT',
                    value: this.currentPage + 1,
                    current: false,
                    cursor: typeof this.cursorHandler.next === 'function' ? await this.cursorHandler.next(this.currentPage + 1) : {}
                });

                pages.push({
                    name: 'LAST',
                    value: this.lastP,
                    current: false,
                    cursor: typeof this.cursorHandler.last === 'function' ? await this.cursorHandler.last(this.lastP) : {}
                });
            }

            pages = pages.map(page => {
               if(typeof page.cursor !== 'object'){
                   throw new Error('cursor handler geriye obje döndürmelidir');
               }

               page.cursor = this.constructor.genCursorString(page.cursor);
               return page;
            });
        }

        return pages;
    }

    async shortRender() {

        let pages = [];

        if(this.totalRow > this.limit && this.currentPage > 0 && this.currentPage <= this.lastP){
            if(this.currentPage > 1){
                pages.push({
                    name: 'FIRST',
                    value: 1,
                    current: false,
                    cursor: typeof this.cursorHandler.first === 'function' ? await this.cursorHandler.first(1) : {}
                });

                pages.push({
                    name: 'PREV',
                    value: this.currentPage - 1,
                    current: false,
                    cursor: typeof this.cursorHandler.prev === 'function' ? await this.cursorHandler.prev(this.currentPage  - 1) : {}
                });
            }

            pages.push({
                name: this.currentPage + ' / ' + this.lastP,
                value: this.currentPage,
                current: true,
                cursor: typeof this.cursorHandler.current === 'function' ? await this.cursorHandler.current(this.currentPage) : {}
            });

            if(this.currentPage < this.lastP){
                pages.push({
                    name: 'NEXT',
                    value: this.currentPage + 1,
                    current: false,
                    cursor: typeof this.cursorHandler.next === 'function' ? await this.cursorHandler.next(this.currentPage + 1) : {}
                });

                pages.push({
                    name: 'LAST',
                    value: this.lastP,
                    current: false,
                    cursor: typeof this.cursorHandler.last === 'function' ? await this.cursorHandler.last(this.lastP) : {}
                });
            }

            for(let page of pages){
                if(typeof page.cursor !== 'object'){
                    throw new Error('cursor handler geriye obje döndürmelidir');
                }

                page.cursor = this.constructor.genCursorString(page.cursor);
            }
        }

        return pages;
    }

}

module.exports = Pagination;
