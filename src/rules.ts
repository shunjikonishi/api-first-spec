import * as Validator from "validator";

interface IRuleConfig {
  value: string;
  validate: (param: any) => (value: any) => boolean;
  message: string;
}

interface IRules {
  [key: string]: IRuleConfig;
}

function isNullOrUndefined(v: any) {
  return v === undefined || v === null;
}

const Rules: IRules = {
  required: {
    value: "boolean",
    validate: (param: any) => {
      return (value: any) => {
        const isNull = isNullOrUndefined(value) || value === "";
        return !(param && isNull);
      };
    },
    message: "[NAME] is required."
  },
  requiredAllowEmptyString: {
    value: "boolean",
    validate: (param: any) => {
      return (value: any) => {
        return !(param && isNullOrUndefined(value));
      };
    },
    message: "[NAME] is required."
  },
  min: {
    value: "number",
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
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
    validate: (param: any) => {
      return (value: any) => {
        if (isNullOrUndefined(value) || !param) {
          return true;
        }
        return Validator.isURL(String(value), {
          require_tld: false
        });
      };
    },
    message: "[NAME] must be valid url format."
  },
  list: {
    value: "array",
    validate: (param: any) => {
      return (value: any) => {
        if (isNullOrUndefined(value)) {
          return true;
        }
        const array = param as Array<any>;
        return array.indexOf(value) !== -1;
      };
    },
    message: "[NAME] must be one of [[PARAM]]."
  }
};

export class Rule {
  constructor(private _name: string, private _param: any, private config: IRuleConfig) {
  }

  public message(key: string, value: any): string {
    let ret = this.config.message;
    ret = ret.replace("[NAME]", key);
    ret = ret.replace("[PARAM]", this.param);
    ret = ret.replace("[VALUE]", value);
    return ret;
  }

  public get name() { return this._name; }
  public get param() { return this._param; }

  public validate(value: any, data: any, reqData?: any): boolean {
    let ruleParam = this.param;
    if (typeof(ruleParam) === "function") {
      ruleParam = ruleParam(data, reqData);
    }
    const func = this.config.validate(ruleParam);
    return func(value);
  }

  public isRequired(): boolean {
    return this.name === "required" || this.name === "requiredAllowEmptyString";
  }
}

export class RuleFactory {
  public test(name: string, param: any): void {
    let type: string = typeof(param);
    const config: IRuleConfig = Rules[name];
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

  public hasRule(name: string): boolean {
    return !!Rules[name];
  }

  public getRuleConfig(name: string): IRuleConfig {
    return Rules[name];
  }

  public newInstance(name: string, param: any) {
    return new Rule(name, param, Rules[name]);
  }
}
