import { IParam } from "./param";

export class ParamPool {

  private map: { [key: string]: Array<IParam> } = {};

  constructor(private param: IParam) {
    this.build(param);
  }

  public getParams(key: string) {
    if (key === "*") {
      return this.getAllParams();
    }
    const keys = key.split(".");
    const ret = this.map[keys.shift()];
    if (!ret) {
      return null;
    } else if (keys.length === 0) {
      return ret;
    } else {
      let array: Array<IParam> = [];
      ret.forEach(p => {
        const ret2 = this.doGet(p, [].concat(keys));
        if (Array.isArray(ret2)) {
          array = array.concat(ret2);
        } else if (ret2) {
          array.push(ret2);
        }
      });
      return array.length > 0 ? array : null;
    }
  }

  private doGet(p: IParam, keys: Array<string>): IParam | Array<IParam> {
    const key = keys.shift();
    if (key === "*") {
      return p.childParams();
    }
    const ret = p.getChild(key);
    if (!ret) {
      return null;
    } else if (keys.length === 0) {
      return ret;
    } else {
      return this.doGet(ret, keys);
    }
  }

  private build(p: IParam) {
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

  private getAllParams() {
    let ret: Array<IParam> = [];
    Object.keys(this.map).forEach(key => {
      ret = ret.concat(this.map[key]);
    });
    return ret;
  }

}
