import moment from "moment";
import { Rule, RuleFactory } from "./rules";
import { DataType } from "./datatype";
import { ParamPool } from "./paramPool";

const Rules = new RuleFactory();

function removeElement<T>(array: Array<T>, obj: T): boolean {
  const n = array.indexOf(obj);
  if (n === -1) {
    return false;
  }
  array.splice(n, 1);
  return true;
}

function isValidDataType(type: string): boolean {
  return !!Object.keys(DataType).find((key: string) => DataType[key] === type);
}

export interface IParam {
  name: string;
  type: string;
  isArray: boolean;
  covered: boolean;
  fullname: () => string;
  build: () => void;
  test: () => void;
  validate: (value: any, data: any, reqData: any) => void;  
  addRules: (rules: { [key: string]: Rule }) => void;
  hasRule: (key: string) => boolean;
  childNames: () => Array<string>;
  childParams: () => Array<IParam>;
  allChildParams: () => Array<IParam>;
  hasChildren: () => boolean;
  getChild: (key: string) => IParam;
  clearCoverage: () => void;
  coverage: () => number;
  uncoveredParamNames: () => Array<string>;
}

export class Param implements IParam {
  private _type: string;
  private _isArray: boolean = false;
  private _covered: boolean = false;
  private children: { [key: string]: IParam } = null;
  private tempRules: { [key: string]: any } = {};
  private rules: Array<Rule> = [];
  private format: string = null;

  constructor(private _name: string, value: any, private prefix: string) {
    this.init(value);
  }

  public get name() { return this._name; }
  public get type() { return this._type; }
  public get isArray() { return this._isArray; }
  public get covered() { return this._covered; }

  public clearCoverage() {
    this._covered = false;
    this.childParams().forEach(child => child.clearCoverage());
  }

  public test() {
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

  public build() {
    if (this._type === "date") {
      this.format = this.tempRules.format || "YYYY-MM-DD";
    } else if (this._type === "datetime") {
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

  public validate(value: any, data: any, reqData?: any) {
    if (value) {
      this._covered = true;
    }
    let target = [value];
    if (value && this.isArray) {
      if (!Array.isArray(value)) {
        throw new Error(this.fullname() + " must be array.");
      }
      target = value;
    }
    target.forEach(obj => {
      let dataNames: Array<string> = null;
      if (this.hasChildren() && typeof(obj) === "object") {
        if (Array.isArray(obj)) {
          dataNames = ["array"];
        } else if (obj !== null) {
          dataNames = Object.keys(obj);
        }
      } else if (!this.validateType(obj)) {
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

  public addRules(v: {[key: string]: any}) {
    Object.assign(this.tempRules, v);
  }

  public hasRule(name: string) {
    return !!this.rules.find(rule => {
      return rule.name === name;
    });
  }

  public hasChildren() {
    return this.childNames().length > 0;
  }

  public childNames() {
    return this.children ? Object.keys(this.children) : [];
  }

  public childParams(): Array<IParam> {
    return this.childNames().map(key => {
      return this.children[key];
    });
  }

  public getChild(name: string) {
    return this.children ? this.children[name] : null;
  }

  public allChildParams(): Array<IParam> {
    let result: Array<IParam> = [];
    this.childParams().forEach(child => {
      result.push(child);
      result = result.concat(child.allChildParams());
    });
    return result;
  }

  public coverage(): number {
    const uncovered = this.uncoveredParamNames();
    if (uncovered.length === 0) {
      return 1;
    }
    const all = this.allChildParams();
    return (all.length - uncovered.length) / all.length;
  }

  public uncoveredParamNames(): Array<string> {
    return this.allChildParams().filter(v => !v.covered).map(v => v.fullname());
  }

  public fullname() {
    return this.prefix ? this.prefix + this.name : this.name;
  }

  protected createChild(name: string, value: any) {
    const nextPrefix = this.fullname() + ".";
    return new Param(name, value, nextPrefix);
  }

  private validateType(value: any) {
    if (value === null || value === undefined) {
      return true;
    }
    const type = typeof(value);
    switch (this._type) {
      case DataType.ANY:
        return true;
      case DataType.STRING:
      case DataType.NUMBER:
      case DataType.BOOLEAN:
        return type === this._type;
      case DataType.INT:
      case DataType.LONG:
        return type === "number" && Math.floor(value) === value;
      case DataType.DOUBLE:
        return type === "number";
      case DataType.DATE:
      case DataType.DATETIME:
        const d = moment(value);
        return d && moment(d.format(this.format), this.format).utcOffset() === d.utcOffset();
      case DataType.BIT:
        return value === "0" || value === "1";
    }
    return false;
  }

  private init(value: any) {
    if (typeof(value) === "string") {
      const array = value.split(",").map(v => v.trim());
      value = array.shift();
      if (array.length > 0) {
        const rules: { [key: string]: string } = {};
        array.forEach(ruleItem => {
          const kv = ruleItem.split("=").map(v => v.trim());
          const ruleName = kv[0];
          let ruleValue: any = kv[1] || "true";
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
          } else {
            throw new Error(`Unknown rule ${ruleName}`);
          }
          rules[ruleName] = ruleValue;
        });
        this.addRules(rules);
      }
    }
    switch (typeof(value)) {
      case "string":
        this._type = value;
        break;
      case "object":
        let obj = value;
        if (Array.isArray(value)) {
          this._isArray = true;
          obj = value[0];
        } else {
          this._type = "object";
        }
        if (typeof(obj) === "string") {
          this._type = obj;
        } else if (Array.isArray(obj)) {
          this._type = "array";
          this.children = {
            array: this.createChild("array", obj)
          };
        } else {
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

export class TopLevelParam extends Param {

  constructor(name: string, value: any, rules?: any) {
    super(name, value, "");
    if (rules) {
      this.applyRules(rules);
    }
    this.build();
  }

  protected createChild(name: string, value: any) {
    return new Param(name, value, "");
  }

  private applyRules(rules: any) {
    const pool = new ParamPool(this);
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
