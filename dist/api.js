"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const param_1 = require("./param");
const paramPool_1 = require("./paramPool");
var Method;
(function (Method) {
    Method["GET"] = "GET";
    Method["POST"] = "POST";
    Method["PUT"] = "PUT";
    Method["DELETE"] = "DELETE";
})(Method = exports.Method || (exports.Method = {}));
var ContentType;
(function (ContentType) {
    ContentType["CSV"] = "text/csv";
    ContentType["TEXT"] = "text/plain";
    ContentType["JSON"] = "application/json";
    ContentType["URLENCODED"] = "application/x-www-form-urlencoded";
    ContentType["MULTIPART"] = "multipart/form-data";
})(ContentType = exports.ContentType || (exports.ContentType = {}));
class Request {
    constructor(config) {
        this._params = null;
        this._rules = null;
        this._headers = null;
        this._contentType = config.contentType ? config.contentType : ContentType.URLENCODED;
        this._rules = config.rules;
        this._headers = config.headers;
        if (config.params) {
            this._params = new param_1.TopLevelParam("request", config.params, config.rules);
        }
    }
    get contentType() { return this._contentType; }
    get params() { return this._params; }
    get rules() { return this._rules; }
    get headers() { return this._headers; }
}
exports.Request = Request;
class Response {
    constructor(config) {
        this._data = null;
        this._rules = null;
        this._contentType = config.contentType ? config.contentType : ContentType.JSON;
        this._rules = config.rules;
        if (config.data) {
            this._data = new param_1.TopLevelParam("response", config.data, config.rules);
        }
    }
    get contentType() { return this._contentType; }
    get data() { return this._data; }
    get rules() { return this._rules; }
}
exports.Response = Response;
class API {
    constructor(config) {
        this._verbose = false;
        this.init(config);
    }
    get name() { return this._name; }
    get endpoint() { return this._endpoint; }
    get method() { return this._method; }
    get request() { return this._request; }
    get response() { return this._response; }
    get urlParams() { return this._urlParams; }
    verbose(v) {
        if (typeof v === "boolean") {
            this._verbose = v;
            return this;
        }
        else {
            return this._verbose;
        }
    }
    isSuccess(data, res) {
        return res.statusCode >= 200 && res.statusCode < 300;
    }
    isBadRequest(data, res) {
        return res.statusCode === 400;
    }
    isNotFound(data, res) {
        return res.statusCode === 404;
    }
    isUnauthorized(data, res) {
        return res.statusCode === 401;
    }
    isForbidden(data, res) {
        return res.statusCode === 403;
    }
    isClientError(data, res) {
        return res.statusCode >= 400 && res.statusCode < 500;
    }
    validateResponse(data, res, reqData) {
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
    test() {
        function testContentType(value) {
            if (!Object.values(ContentType).find((v) => v === value)) {
                throw new Error("Invalid ContentType: " + value);
            }
        }
        function testEndpoint(value) {
            if (!value) {
                throw new Error("endpoint is not defined");
            }
            if (value.charAt(0) !== "/") {
                throw new Error("endpoint must starts with '/'");
            }
        }
        function testMethod(value) {
            if (!value) {
                throw new Error("method is not defined");
            }
            if (!Object.values(Method).find((v) => v === value)) {
                throw new Error("Invalid method: " + value);
            }
        }
        function testRulesReference(params, rules) {
            const pool = new paramPool_1.ParamPool(params);
            const ret = [];
            Object.keys(rules).forEach(key => {
                if (!pool.getParams(key)) {
                    ret.push(key);
                }
            });
            if (ret.length > 0) {
                throw new Error("Undefined parameters : " + JSON.stringify(ret));
            }
        }
        function testRequest(req) {
            testContentType(req.contentType);
            if (req.params) {
                req.params.test();
            }
            if (req.params && req.rules) {
                testRulesReference(req.params, req.rules);
            }
        }
        function testResponse(response) {
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
    testCoverage() {
        if (this.request && this.request.params && this.request.params.coverage() !== 1) {
            throw new Error(`Request parameter [${this.request.params.uncoveredParamNames()}] are not covered.`);
        }
    }
    clearCoverage() {
        if (this.request && this.request.params) {
            this.request.params.clearCoverage();
        }
    }
    init(config) {
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
exports.API = API;
