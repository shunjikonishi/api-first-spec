"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Validator = __importStar(require("validator"));
function isNullOrUndefined(v) {
    return v === undefined || v === null;
}
const Rules = {
    required: {
        value: "boolean",
        validate: (param) => {
            return (value) => {
                const isNull = isNullOrUndefined(value) || value === "";
                return !(param && isNull);
            };
        },
        message: "[NAME] is required."
    },
    requiredAllowEmptyString: {
        value: "boolean",
        validate: (param) => {
            return (value) => {
                return !(param && isNullOrUndefined(value));
            };
        },
        message: "[NAME] is required."
    },
    min: {
        value: "number",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                return value >= param;
            };
        },
        message: "[NAME] must be equal or greater than [PARAM]."
    },
    max: {
        value: "number",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                return value <= param;
            };
        },
        message: "[NAME] must be equal or less than [PARAM]."
    },
    minlength: {
        value: "number",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                return String(value).length >= param;
            };
        },
        message: "The length of [NAME] must be equal or greater than [PARAM]."
    },
    maxlength: {
        value: "number",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                return String(value).length <= param;
            };
        },
        message: "The length of [NAME] must be equal or less than [PARAM]."
    },
    pattern: {
        value: "string",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                const regex = new RegExp(param);
                return regex.test(value);
            };
        },
        message: "[NAME] must be match with pattern /[PARAM]/."
    },
    email: {
        value: "boolean",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value) || !param) {
                    return true;
                }
                return Validator.isEmail(String(value));
            };
        },
        message: "[NAME] must be valid email format."
    },
    url: {
        value: "boolean",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value) || !param) {
                    return true;
                }
                return Validator.isURL(String(value));
            };
        },
        message: "[NAME] must be valid url format."
    },
    list: {
        value: "array",
        validate: (param) => {
            return (value) => {
                if (isNullOrUndefined(value)) {
                    return true;
                }
                const array = param;
                return array.indexOf(value) !== -1;
            };
        },
        message: "[NAME] must be one of [[PARAM]]."
    }
};
class Rule {
    constructor(_name, _param, config) {
        this._name = _name;
        this._param = _param;
        this.config = config;
    }
    message(key, value) {
        let ret = this.config.message;
        ret = ret.replace("[NAME]", key);
        ret = ret.replace("[PARAM]", this.param);
        ret = ret.replace("[VALUE]", value);
        return ret;
    }
    get name() { return this._name; }
    get param() { return this._param; }
    validate(value, data, reqData) {
        let ruleParam = this.param;
        if (typeof (ruleParam) === "function") {
            ruleParam = ruleParam(data, reqData);
        }
        const func = this.config.validate(ruleParam);
        return func(value);
    }
    isRequired() {
        return this.name === "required" || this.name === "requiredAllowEmptyString";
    }
}
exports.Rule = Rule;
class RuleFactory {
    test(name, param) {
        let type = typeof (param);
        const config = Rules[name];
        if (type === "object" && Array.isArray(param)) {
            type = "array";
        }
        if (!config) {
            throw new Error("Unknown rule: " + name);
        }
        if (type !== config.value && type !== "function") {
            throw new Error(`rules.${name} must be function or ${config.value}`);
        }
    }
    hasRule(name) {
        return !!Rules[name];
    }
    getRuleConfig(name) {
        return Rules[name];
    }
    newInstance(name, param) {
        return new Rule(name, param, Rules[name]);
    }
}
exports.RuleFactory = RuleFactory;
