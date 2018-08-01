"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ParamPool {
    constructor(param) {
        this.param = param;
        this.map = {};
        this.build(param);
    }
    getParams(key) {
        if (key === "*") {
            return this.getAllParams();
        }
        const keys = key.split(".");
        const ret = this.map[keys.shift()];
        if (!ret) {
            return null;
        }
        else if (keys.length === 0) {
            return ret;
        }
        else {
            let array = [];
            ret.forEach(p => {
                const ret2 = this.doGet(p, [].concat(keys));
                if (Array.isArray(ret2)) {
                    array = array.concat(ret2);
                }
                else if (ret2) {
                    array.push(ret2);
                }
            });
            return array.length > 0 ? array : null;
        }
    }
    doGet(p, keys) {
        const key = keys.shift();
        if (key === "*") {
            return p.childParams();
        }
        const ret = p.getChild(key);
        if (!ret) {
            return null;
        }
        else if (keys.length === 0) {
            return ret;
        }
        else {
            return this.doGet(ret, keys);
        }
    }
    build(p) {
        if (p.hasChildren()) {
            p.childNames().forEach(name => {
                const child = p.getChild(name);
                let array = this.map[name];
                if (!array) {
                    array = [];
                    this.map[name] = array;
                }
                array.push(child);
                this.build(child);
            });
        }
    }
    getAllParams() {
        let ret = [];
        Object.keys(this.map).forEach(key => {
            ret = ret.concat(this.map[key]);
        });
        return ret;
    }
}
exports.ParamPool = ParamPool;
