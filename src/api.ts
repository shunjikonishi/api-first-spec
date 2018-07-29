import { IParam, Param, TopLevelParam } from "./param";
import { ParamPool } from "./paramPool";
import request from "request";

export enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE"
}

export enum ContentType {
  CSV = "text/csv",
  TEXT = "text/plain",
  JSON = "application/json",
  URLENCODED = "application/x-www-form-urlencoded",
  MULTIPART = "multipart/form-data"
}

export class Request {
  private _contentType: string;
  private _params?: IParam = null;
  private _rules?: any = null;
  private _headers: any = null;

  constructor(config: RequestConfig) {
    this._contentType = config.contentType ? config.contentType : ContentType.URLENCODED;
    this._rules = config.rules;
    this._headers = config.headers;
    if (config.params) {
      this._params = new TopLevelParam("request", config.params, config.rules);
    }
  }

  public get contentType() { return this._contentType; }
  public get params() { return this._params; }
  public get rules() { return this._rules; }
  public get headers() { return this._headers; }
}

export class Response {
  private _contentType: string;
  private _data?: IParam = null;
  private _rules?: any = null;

  constructor(config: ResponseConfig) {
    this._contentType = config.contentType ? config.contentType : ContentType.JSON;
    this._rules = config.rules;
    if (config.data) {
      this._data = new TopLevelParam("response", config.data, config.rules);
    }
  }

  public get contentType() { return this._contentType; }
  public get data() { return this._data; }
  public get rules() { return this._rules; }
}

export class API {
  private _name: string;
  private _endpoint: string;
  private _method: string;
  private _request: Request;
  private _response: Response;
  private _urlParams: Array<string>;
  private _verbose: boolean = false;

  constructor(config: ApiConfig) {
    this.init(config);
  }

  public get name() { return this._name; }
  public get endpoint() { return this._endpoint; }
  public get method() { return this._method; }
  public get request() { return this._request; }
  public get response() { return this._response; }
  public get urlParams() { return this._urlParams; }

  public verbose(v?: boolean) { 
    if (typeof v === "boolean") {
      this._verbose = v;
      return this;
    } else {
      return this._verbose;
    }
  }

  public isSuccess(data: any, res: request.Response) {
    return res.statusCode >= 200 && res.statusCode < 300;
  }
  public isBadRequest(data: any, res: request.Response) {
    return res.statusCode === 400;
  }
  public isNotFound(data: any, res: request.Response) {
    return res.statusCode === 404;
  }
  public isUnauthorized(data: any, res: request.Response) {
    return res.statusCode === 401;
  }
  public isForbidden(data: any, res: request.Response) {
    return res.statusCode === 403;
  }
  public isClientError(data: any, res: request.Response) {
    return res.statusCode >= 400 && res.statusCode < 500;
  }
  public validateResponse(data: any, res: request.Response, reqData: any) {
    if (res.statusCode === 204) {
      return;
    }
    let resContentType = res.headers["content-type"];
    if (resContentType) {
      resContentType = resContentType.split(";")[0].trim().toLowerCase();
    }
    if (this.response.contentType !== resContentType) {
      throw new Error("Content-Type is not match: " + resContentType);
    }

    if (resContentType === ContentType.JSON) {
      this.response.data.validate(data, data, reqData);
    }
  }
  public test() {
    function testContentType(value: string) {
      if (!(value in ContentType)) {
        throw new Error("Invalid ContentType: " + value);
      }
    }
    function testEndpoint(value: string) {
      if (!value) {
        throw new Error("endpoint is not defined");
      }
      if (value.charAt(0) !== "/") {
        throw new Error("endpoint must starts with '/'");
      }
    }
    function testMethod(value: string) {
      if (!value) {
        throw new Error("method is not defined");
      }
      if (!(value in Method)) {
        throw new Error("Invalid method: " + value);
      }
    }
    function testRulesReference(params: IParam, rules: any) {
      const pool = new ParamPool(params);
      const ret: Array<string> = [];
      Object.keys(rules).forEach(key => {
        if (!pool.getParams(key)) {
          ret.push(key);
        }
      });
      if (ret.length > 0) {
        throw new Error("Undefined parameters : " + JSON.stringify(ret));
      }
    }
    function testRequest(req: Request) {
      testContentType(req.contentType);
      if (req.params) {
        req.params.test();
      }
      if (req.params && req.rules) {
        testRulesReference(req.params, req.rules);
      }
    }
    function testResponse(response: Response) {
      if (!response) {
        throw new Error("response is not defined.");
      }
      if (!response.data) {
        throw new Error("data is not defined.");
      }
      response.data.test();
      if (response.data && response.rules) {
        testRulesReference(response.data, response.rules);
      }
    }
    testEndpoint(this.endpoint);
    testMethod(this.method);
    testRequest(this.request);
    testResponse(this.response);
  }

  private init(config: ApiConfig) {
    this._name = config.name || config.endpoint;
    this._endpoint = config.endpoint;
    this._method = config.method;
    this._request = new Request(config.request || {});
    if (config.response) {
      this._response = new Response(config.response);
    }
    if (config.endpoint) {
      const urlParams = config.endpoint.match(/\[[^\]]*\]/g);
      if (urlParams && urlParams.length > 0) {
        this._urlParams = urlParams.map(v => v.substring(1, v.length - 1));
      }
    }
  }
}
