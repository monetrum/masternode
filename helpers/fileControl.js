'use strict';

const fs = require('fs').promises;

class FileControl {
    constructor(file){
        this.file = file;
    }

    mime(allowed){
        if(!Array.isArray(allowed)){
            return new Error('izin verilenler bir dizi olmalı');
        }

        return allowed.indexOf(this.file.mimetype) !== -1;
    }

    ext(allowed){
        if(!Array.isArray(allowed)){
            return new Error('izin verilenler bir dizi olmalı');
        }

        return allowed.indexOf(this.getExt()) !== -1;
    }

    getExt(){
        let fileArr = this.file.originalname.split('.');
        let ext =  fileArr[fileArr.length - 1];
        if(ext){
            return ext.toLowerCase();
        }

        return new Error('Dosyanın bir uzantısı olmalı');
    }

    write(folder, name){
        return fs.writeFile(folder + '/' + name + '.' + this.getExt(), this.file.buffer);
    }
}

module.exports = FileControl;