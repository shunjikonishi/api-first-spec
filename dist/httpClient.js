"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = __importDefault(require("querystring"));
const Request = require("request");
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
class HttpClient {
    constructor(host, ssl, defaults = {}) {
        this.host = host;
        this.ssl = ssl;
        this.defaults = defaults;
        this._api = null;
        this._params = null;
        this._headers = null;
        this.cookieJar = Request.jar();
        this.request = Request.defaults({ jar: this.cookieJar });
        if (!defaults.headers) {
            defaults.headers = {};
        }
        if (!defaults.params) {
            defaults.params = {};
        }
    }
    api(v) {
        this._api = v;
        return this;
    }
    params(v) {
        this._params = v;
        return this;
    }
    headers(v) {
        this._headers = v;
        return this;
    }
    success(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isSuccess(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Success.\n${this.stringify(result.data)}`);
            }
            this._api.validateResponse(result.data, result.res, result.params);
            return this.done(callback, result);
        }, validateInput);
    }
    badRequest(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isBadRequest(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't BadRequest.\n${this.stringify(result.data)}`);
            }
            return this.done(callback, result);
        }, validateInput);
    }
    notFound(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isNotFound(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't NotFound.\n${this.stringify(result.data)}`);
            }
            return this.done(callback, result);
        }, validateInput);
    }
    unauthorized(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isUnauthorized(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Unauthorized.\n${this.stringify(result.data)}`);
            }
            return this.done(callback, result);
        }, validateInput);
    }
    forbidden(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isForbidden(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Forbidden.\n${this.stringify(result.data)}`);
            }
            return this.done(callback, result);
        }, validateInput);
    }
    clientError(callback, validateInput = true) {
        return this.doTest(result => {
            if (!this._api.isClientError(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't ClientError.\n${this.stringify(result.data)}`);
            }
            return this.done(callback, result);
        }, validateInput);
    }
    execute() {
        return this.doTest(null, false);
    }
    setDefaultHeaders(headers) {
        this.defaults.headers = headers;
    }
    setDefaultParams(params) {
        this.defaults.params = params;
    }
    normalizeData(params) {
        function getValue(v) {
            if (typeof (v) === "function") {
                v = v(params);
            }
            return querystring_1.default.escape(v);
        }
        if (typeof (params) === "function") {
            params = params();
        }
        const ret = {};
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                let value = params[key];
                if (typeof (value) === "function") {
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
    toJson(params) {
        function normalize(p) {
            let type = typeof (p);
            let ret = p;
            if (type === "function") {
                p = p();
                type = typeof (p);
            }
            if (type === "object") {
                if (Array.isArray(p)) {
                    ret = [];
                    for (const item of p) {
                        ret.push(normalize(item));
                    }
                }
                else {
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
        if (typeof (params) === "function") {
            params = params();
        }
        params = normalize(params);
        return JSON.stringify(params);
    }
    done(callback, result) {
        function isDone() {
            return callback.toString().indexOf("done() invoked with non-Error") !== -1;
        }
        if (!callback) {
            return;
        }
        if (isDone()) {
            return callback();
        }
        else {
            return callback(result.data, result.res, result.req);
        }
    }
    stringify(data) {
        if (typeof (data) === "object") {
            return JSON.stringify(data);
        }
        return "" + data;
    }
    doTest(callback, validateInput = true) {
        const self = this;
        return new Promise((resolve, reject) => {
            function isJson(contentType) {
                if (!contentType)
                    return false;
                const ct = contentType.toLowerCase();
                return ct.indexOf("/json") > 0 || ct.indexOf("+json") > 0;
            }
            function buildEndpoint() {
                let ret = currentApi.endpoint;
                if (currentApi.urlParams) {
                    currentApi.urlParams.forEach((key) => {
                        ret = ret.replace("[" + key + "]", currentParams[key]);
                        delete currentParams[key];
                    });
                }
                return (self.ssl ? "https" : "http") + "://" + self.host + ret;
            }
            function doCallback(ret) {
                if (currentApi.verbose()) {
                    /* tslint:disable:no-console */
                    console.log("**** Response Data ****");
                    console.log("statusCode = " + ret.res.statusCode);
                    console.log("data = ");
                    console.log(ret.data);
                }
                if (!callback) {
                    resolve(ret);
                    return;
                }
                const ct = ret.res.headers["content-type"];
                if (isJson(ct)) {
                    ret.data = JSON.parse(ret.data);
                }
                const ret2 = callback(ret);
                resolve(ret2 ? ret2 : ret.data);
            }
            function getParamsForValidation() {
                const result = Object.assign({}, currentParams);
                if (currentApi.urlParams) {
                    currentApi.urlParams.forEach(key => {
                        delete result[key];
                    });
                }
                return normalize(result);
            }
            // Expand parameters which contains `.` for GET. e.g. `sortOrder.column`
            function normalize(params) {
                if (!params || typeof (params) !== "object") {
                    return params;
                }
                const newResult = {};
                Object.keys(params).filter(key => key.indexOf(".") === -1).forEach(key => {
                    newResult[key] = params[key];
                });
                Object.keys(params).filter(key => key.indexOf(".") !== -1).forEach(key => {
                    const array = key.split(".");
                    const parentKey = array.shift();
                    const childKey = array.join(".");
                    if (newResult[parentKey]) {
                        newResult[parentKey][childKey] = params[key];
                    }
                    else {
                        const newChild = {
                            [childKey]: params[key]
                        };
                        newResult[parentKey] = newChild;
                    }
                });
                Object.keys(newResult).filter(key => typeof (newResult[key]) === "object" && !Array.isArray(newResult[key])).forEach(key => {
                    newResult[key] = normalize(newResult[key]);
                });
                return newResult;
            }
            const currentApi = self._api;
            const currentParams = Object.assign({}, self.defaults.params, self._params);
            const currentHeaders = Object.assign({}, self.defaults.headers, self._headers);
            try {
                self._params = null;
                self._headers = null;
                if (!currentApi) {
                    throw new Error("api isn't set.");
                }
                if (validateInput && currentApi.request.params && currentApi.request.params.hasChildren()) {
                    const paramsForValidation = getParamsForValidation();
                    currentApi.request.params.validate(paramsForValidation, paramsForValidation, null);
                }
                const requestParams = {
                    method: currentApi.method,
                    headers: currentHeaders,
                    path: buildEndpoint(),
                    data: Object.keys(currentParams).length > 0 ? currentParams : null,
                    log: currentApi.verbose()
                };
                if (currentApi.request && currentApi.request.headers) {
                    Object.assign(requestParams.headers, currentApi.request.headers);
                }
                if (currentApi.request && currentApi.request.contentType) {
                    requestParams.headers["Content-Type"] = currentApi.request.contentType;
                }
                self.doRequest(requestParams, doCallback);
            }
            catch (e) {
                setTimeout(() => {
                    throw e;
                }, 0);
            }
        });
    }
    doRequest(config, callback) {
        const requestOptions = {
            method: config.method,
            headers: config.headers || {},
            url: config.path
        };
        if (config.method === "GET" && config.data) {
            requestOptions.qs = config.data;
        }
        else if (config.data) {
            let ct = config.headers["Content-Type"];
            if (!ct) {
                ct = "application/x-www-form-urlencoded";
                requestOptions.headers["Content-Type"] = ct;
            }
            if (ct === "application/x-www-form-urlencoded") {
                requestOptions.form = this.normalizeData(config.data);
            }
            else if (ct === "multipart/form-data") {
                const formData = {};
                Object.keys(config.data).forEach(key => {
                    const value = config.data[key];
                    if (Array.isArray(value)) {
                        formData[key + "[]"] = value;
                    }
                    else {
                        formData[key] = value;
                    }
                });
                requestOptions.formData = formData;
            }
            else if (ct === "application/json") {
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
        const req = this.request(requestOptions, (error, res, body) => {
            if (error) {
                console.log("!!!!! error !!!!!", error, res, body);
                return;
            }
            const result = {
                data: body,
                res,
                req,
                params: config.data
            };
            callback(result);
        });
    }
    copy() {
        const ret = new HttpClient(this.host, this.ssl, this.defaults);
        ret.assign(this.cookieJar, this._api, this._params, this._headers);
        return ret;
    }
    assign(cookieJar, api, params, headers) {
        this.cookieJar = cookieJar;
        this._api = api;
        this._params = params;
        this._headers = headers;
        this.request = this.request.defaults({ jar: cookieJar });
    }
}
exports.HttpClient = HttpClient;
