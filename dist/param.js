"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const rules_1 = require("./rules");
const datatype_1 = require("./datatype");
const paramPool_1 = require("./paramPool");
const Rules = new rules_1.RuleFactory();
function removeElement(array, obj) {
    const n = array.indexOf(obj);
    if (n === -1) {
        return false;
    }
    array.splice(n, 1);
    return true;
}
function isValidDataType(type) {
    return !!Object.keys(datatype_1.DataType).find((key) => datatype_1.DataType[key] === type);
}
class Param {
    constructor(_name, value, prefix) {
        this._name = _name;
        this.prefix = prefix;
        this._isArray = false;
        this.children = null;
        this.tempRules = {};
        this.rules = [];
        this.format = null;
        this.init(value);
    }
    get name() { return this._name; }
    get type() { return this._type; }
    get isArray() { return this._isArray; }
    test() {
        function testDataType() {
            if (type === "object" || type === "array") {
                return;
            }
            if (!isValidDataType(type)) {
                throw new Error(`Invalid datatype: ${fullname}:  ${type}`);
            }
        }
        function testRules() {
            Object.keys(tempRules).map(key => {
                if (key !== "format") {
                    const value = tempRules[key];
                    Rules.test(key, value);
                }
            });
        }
        const type = this._type;
        const tempRules = this.tempRules;
        const fullname = this.fullname();
        testDataType();
        testRules();
        if (this.children) {
            Object.keys(this.children).forEach(key => {
                this.children[key].test();
            });
        }
    }
    build() {
        if (this._type === "date") {
            this.format = this.tempRules.format || "YYYY-MM-DD";
        }
        else if (this._type === "datetime") {
            this.format = this.tempRules.format || "YYYY-MM-DD HH:mm:SS";
        }
        Object.keys(this.tempRules).map(key => {
            if (key !== "format") {
                if (Rules.hasRule(key)) {
                    this.rules.push(Rules.newInstance(key, this.tempRules[key]));
                }
            }
        });
        if (this.children) {
            Object.keys(this.children).forEach(key => {
                this.children[key].build();
            });
        }
    }
    validate(value, data, reqData) {
        let target = [value];
        if (value && this.isArray) {
            if (!Array.isArray(value)) {
                throw new Error(this.fullname() + " must be array.");
            }
            target = value;
        }
        target.forEach(obj => {
            let dataNames = null;
            if (this.hasChildren() && typeof (obj) === "object") {
                if (Array.isArray(obj)) {
                    dataNames = ["array"];
                }
                else if (obj !== null) {
                    dataNames = Object.keys(obj);
                }
            }
            else if (!this.validateType(obj)) {
                throw new Error(`${obj}: ${this.fullname()} must be ${this.isArray ? "array of " : ""} ${this.type}`);
            }
            this.rules.forEach(rule => {
                if (!rule.validate(obj, data, reqData)) {
                    throw new Error(`${obj}: ${rule.message(this.fullname(), obj)}`);
                }
            });
            if (this.hasChildren() && dataNames) {
                Object.keys(this.children).forEach(key => {
                    const p = this.children[key];
                    const v = removeElement(dataNames, key) ? obj[key] : null;
                    p.validate(v, data, reqData);
                });
                if (dataNames.length > 0) {
                    throw new Error(`Unknown keys:  ${JSON.stringify(dataNames)}`);
                }
            }
        });
    }
    addRules(v) {
        Object.assign(this.tempRules, v);
    }
    hasRule(name) {
        return !!this.rules.find(rule => {
            return rule.name === name;
        });
    }
    hasChildren() {
        return this.childNames().length > 0;
    }
    childNames() {
        return this.children ? Object.keys(this.children) : [];
    }
    childParams() {
        return this.childNames().map(key => {
            return this.children[key];
        });
    }
    getChild(name) {
        return this.children ? this.children[name] : null;
    }
    createChild(name, value) {
        const nextPrefix = this.fullname() + ".";
        return new Param(name, value, nextPrefix);
    }
    validateType(value) {
        if (value === null || value === undefined) {
            return true;
        }
        const type = typeof (value);
        switch (this._type) {
            case datatype_1.DataType.ANY:
                return true;
            case datatype_1.DataType.STRING:
            case datatype_1.DataType.NUMBER:
            case datatype_1.DataType.BOOLEAN:
                return type === this._type;
            case datatype_1.DataType.INT:
            case datatype_1.DataType.LONG:
                return type === "number" && Math.floor(value) === value;
            case datatype_1.DataType.DOUBLE:
                return type === "number";
            case datatype_1.DataType.DATE:
            case datatype_1.DataType.DATETIME:
                const d = moment_1.default(value);
                return d && moment_1.default(d.format(this.format), this.format).utcOffset() === d.utcOffset();
            case datatype_1.DataType.BIT:
                return value === "0" || value === "1";
        }
        return false;
    }
    fullname() {
        return this.prefix ? this.prefix + this.name : this.name;
    }
    init(value) {
        if (typeof (value) === "string") {
            const array = value.split(",").map(v => v.trim());
            value = array.shift();
            if (array.length > 0) {
                const rules = {};
                array.forEach(ruleItem => {
                    const kv = ruleItem.split("=").map(v => v.trim());
                    const ruleName = kv[0];
                    let ruleValue = kv[1] || "true";
                    const rule = Rules.getRuleConfig(ruleName);
                    if (rule) {
                        switch (rule.value) {
                            case "number":
                                ruleValue = Number(ruleValue);
                                break;
                            case "boolean":
                                ruleValue = ruleValue === "true";
                                break;
                        }
                    }
                    else {
                        throw new Error(`Unknown rule ${ruleName}`);
                    }
                    rules[ruleName] = ruleValue;
                });
                this.addRules(rules);
            }
        }
        switch (typeof (value)) {
            case "string":
                this._type = value;
                break;
            case "object":
                let obj = value;
                if (Array.isArray(value)) {
                    this._isArray = true;
                    obj = value[0];
                }
                else {
                    this._type = "object";
                }
                if (typeof (obj) === "string") {
                    this._type = obj;
                }
                else if (Array.isArray(obj)) {
                    this._type = "array";
                    this.children = {
                        array: this.createChild("array", obj)
                    };
                }
                else {
                    this._type = "object";
                    this.children = {};
                    Object.keys(obj).forEach(key => {
                        this.children[key] = this.createChild(key, obj[key]);
                    });
                }
                break;
        }
    }
}
exports.Param = Param;
class TopLevelParam extends Param {
    constructor(name, value, rules) {
        super(name, value, "");
        if (rules) {
            this.applyRules(rules);
        }
        this.build();
    }
    createChild(name, value) {
        return new Param(name, value, "");
    }
    applyRules(rules) {
        const pool = new paramPool_1.ParamPool(this);
        Object.keys(rules).forEach(key => {
            const array = pool.getParams(key);
            if (array) {
                array.forEach(p => {
                    p.addRules(rules[key]);
                });
            }
        });
    }
}
exports.TopLevelParam = TopLevelParam;
