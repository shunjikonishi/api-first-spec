import querystring from "querystring";
import request from "request";
import { API } from "./api";

export interface IDefaultParameters {
  headers?: { [key: string]: string};
  params?: { [key: string]: string};
}

interface IRequestParams {
  method: string;
  headers?: { [key: string]: string};
  path: string;
  data: any;
  log: boolean;
}

interface IHttpResult {
  data: any;
  res: request.Response;
  req: request.Request;
  params?: any;
}

/**
 * Wrapper of http/https library.
 *
 * `defaults` expect have two keys: params and headers
 *
 * @param {string} host
 * @param {boolean} ssl use to switch using `https` and `http`
 * @param {object} defaults will set unmodifiable default value
 * @return {object}
 */
export class HttpClient {

  private request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
  private cookieJar: request.CookieJar;
  private api: API = null;
  private params: any = null;
  private headers: any = null;

  constructor(private host: string, private ssl: boolean, private defaults: IDefaultParameters = {}) {
    this.cookieJar = request.jar();
    this.request = request.defaults({ jar: this.cookieJar});
    if (!defaults.headers) {
      defaults.headers = {};
    }
    if (!defaults.params) {
      defaults.params = {};
    }
  }

  public withAPI(v: API) {
    this.api = v;
    return this;
  }

  public withParams(v: any) {
    this.params = v;
    return this;
  }

  public withHeaders(v: any) {
    this.headers = v;
    return this;
  }

  public success(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isSuccess(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Success.\n${this.stringify(result.data)}`);
      }
      this.api.validateResponse(result.data, result.res, result.params);
      this.done(callback, result);
    });
  }

  public badRequest(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isBadRequest(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't BadRequest.\n${this.stringify(result.data)}`);
      }
      this.done(callback, result);
    });
  }

  public notFound(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isNotFound(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't NotFound.\n${this.stringify(result.data)}`);
      }
      this.done(callback, result);
    });
  }

  public unauthorized(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isUnauthorized(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Unauthorized.\n${this.stringify(result.data)}`);
      }
      this.done(callback, result);
    });
  }

  public forbidden(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isForbidden(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Forbidden.\n${this.stringify(result.data)}`);
      }
      this.done(callback, result);
    });
  }
  
  public clientError(callback: (data?: any, res?: request.Response, req?: request.Request) => void) {
    return this.doTest(result => {
      if (!this.api.isClientError(result.data, result.res)) {
        throw new Error(`StatusCode=${result.res.statusCode}. Response isn't ClientError.\n${this.stringify(result.data)}`);
      }
      this.done(callback, result);
    });
  }

  private normalizeData(params: any): any {
    function getValue(v: any) {
      if (typeof(v) === "function") {
        v = v(params);
      }
      return querystring.escape(v);
    }
    if (typeof(params) === "function") {
      params = params();
    }
    const ret: any = {};
    for (let key in params) {
      if (params.hasOwnProperty(key)) {
        let value = params[key];
        if (typeof(value) === "function") {
          value = value(params);
        }
        if (key.endsWith("[]")) {
          key = key.substring(0, key.length - 2);
        }
        ret[key] = value;
      }
    }
    return ret;
  }

  private toJson(params: any) {
    function normalize(p: any) {
      let type = typeof(p);
      let ret = p;
      if (type === "function") {
        p = p();
        type = typeof(p); 
      }
      if (type === "object") {
        if (Array.isArray(p)) {
          ret = [];
          for (const item of p) {
            ret.push(normalize(item));
          }
        } else {
          ret = {};
          for (const key in p) {
            if (p.hasOwnProperty(key)) {
              ret[key] = normalize(p[key]);
            }
          }
        }
      }
      return ret;
    }
    if (typeof(params) === "function") {
      params = params();
    }
    params = normalize(params);
    return JSON.stringify(params);
  }

  private done(callback: (data?: any, res?: request.Response, req?: request.Request) => void, result: IHttpResult) {
    function isDone() {
      return callback.toString().indexOf("done() invoked with non-Error") !== -1;
    }
    if (!callback) {
      return;
    }
    if (isDone()) {
      callback();
    } else {
      callback(result.data, result.res, result.req);
    }
  }
  private stringify(data: any) {
    if (typeof(data) === "object") {
      return JSON.stringify(data);
    }
    return "" + data;
  }

  private doTest(callback: (ret: IHttpResult) => void): Promise<IHttpResult> {
    const self = this;
    return new Promise((resolve, reject) => {
      function isJson(contentType: string) {
        if (!contentType) return false;
        const ct = contentType.toLowerCase();
        return ct.indexOf("/json") > 0 || ct.indexOf("+json") > 0;
      }
      function buildEndpoint() {
        let ret = currentApi.endpoint;
        if (currentApi.urlParams) {
          currentApi.urlParams.forEach((key: string) => {
            ret = ret.replace("[" + key + "]", currentParams[key]);
            delete currentParams[key];
          });
        }
        return (self.ssl ? "https" : "http") + "://" + self.host + ret;
      }
      function doCallback(ret: IHttpResult) {
        if (currentApi.verbose()) {
          /* tslint:disable:no-console */
          console.log("**** Response Data ****");
          console.log("statusCode = " + ret.res.statusCode);
          console.log("data = ");
          console.log(ret.data);
        }
        if (callback) {
          callback(ret);
        }
        resolve(ret);
      }
      const currentApi = self.api;
      const currentParams = Object.assign({}, self.defaults.params, self.params);
      const currentHeaders = Object.assign({}, self.defaults.headers, self.headers);
      self.params = null;
      self.headers = null;
      if (!currentApi) {
        throw new Error("api isn't set.");
      }
      const requestParams: IRequestParams = {
        method: currentApi.method,
        headers: currentHeaders,
        path: buildEndpoint(),
        data: Object.keys(currentParams).length > 0 ? currentParams : null,
        log: currentApi.verbose() as boolean
      };
      if (currentApi.request && currentApi.request.headers) {
        Object.assign(requestParams.headers, currentApi.request.headers);
      }
      if (currentApi.request && currentApi.request.contentType) {
        requestParams.headers["Content-Type"] = currentApi.request.contentType;
      }
      self.doRequest(requestParams, doCallback);
    });
  }

  private doRequest(config: IRequestParams, callback: (ret: IHttpResult) => void) {
    const requestOptions: any = {
      method: config.method,
      headers: config.headers || {},
      url: config.path
    };

    if (config.method === "GET" && config.data) {
      requestOptions.qs = config.data;
    } else if (config.data) {
      let ct = config.headers["Content-Type"];
      if (!ct) {
        ct = "application/x-www-form-urlencoded";
        requestOptions.headers["Content-Type"] = ct;
      }
      if (ct === "application/x-www-form-urlencoded") {
        requestOptions.form = this.normalizeData(config.data);
      } else if (ct === "multipart/form-data") {
        const formData: any = {};
        Object.keys(config.data).forEach(key => {
          const value = config.data[key];
          if (Array.isArray(value)) {
            formData[key + "[]"] = value;
          } else {
            formData[key] = value;
          }
        });
        requestOptions.formData = formData;
      } else if (ct === "application/json") {
        requestOptions.body = this.toJson(config.data);
      }
    }
    if (config.log) {
      console.log("**** Request Data ****");
      console.log(`${config.method} ${config.path}`);
      if (config.data) {
        console.log(JSON.stringify(config.data));
      }
    }
    const req = request(requestOptions, (error: Error, res: request.Response, body: any) => {
      if (error) {
        console.log("!!!!! error !!!!!", error, res, body);
        return;
      }
      const result: IHttpResult = {
        data: body,
        res,
        req,
        params: config.data
      };
      callback(result);
    });
  }
  private copy() {
    const ret = new HttpClient(this.host, this.ssl, this.defaults);
    ret.assign(this.cookieJar, this.api, this.params, this.headers);
    return ret;
  }

  private assign(cookieJar: request.CookieJar, api: API, params: any, headers: any) {
    this.cookieJar = cookieJar;
    this.api = api;
    this.params = params;
    this.headers = headers;
    this.request = request.defaults({ jar: cookieJar});
  }
}
