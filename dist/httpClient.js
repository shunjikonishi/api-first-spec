"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = __importDefault(require("querystring"));
const request_1 = __importDefault(require("request"));
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
        this.api = null;
        this.params = null;
        this.headers = null;
        this.cookieJar = request_1.default.jar();
        this.request = request_1.default.defaults({ jar: this.cookieJar });
        if (!defaults.headers) {
            defaults.headers = {};
        }
        if (!defaults.params) {
            defaults.params = {};
        }
    }
    withAPI(v) {
        this.api = v;
        return this;
    }
    withParams(v) {
        this.params = v;
        return this;
    }
    withHeaders(v) {
        this.headers = v;
        return this;
    }
    success(callback) {
        return this.doTest(result => {
            if (!this.api.isSuccess(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Success.\n${this.stringify(result.data)}`);
            }
            this.api.validateResponse(result.data, result.res, result.params);
            this.done(callback, result);
        });
    }
    badRequest(callback) {
        return this.doTest(result => {
            if (!this.api.isBadRequest(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't BadRequest.\n${this.stringify(result.data)}`);
            }
            this.done(callback, result);
        });
    }
    notFound(callback) {
        return this.doTest(result => {
            if (!this.api.isNotFound(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't NotFound.\n${this.stringify(result.data)}`);
            }
            this.done(callback, result);
        });
    }
    unauthorized(callback) {
        return this.doTest(result => {
            if (!this.api.isUnauthorized(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Unauthorized.\n${this.stringify(result.data)}`);
            }
            this.done(callback, result);
        });
    }
    forbidden(callback) {
        return this.doTest(result => {
            if (!this.api.isForbidden(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't Forbidden.\n${this.stringify(result.data)}`);
            }
            this.done(callback, result);
        });
    }
    clientError(callback) {
        return this.doTest(result => {
            if (!this.api.isClientError(result.data, result.res)) {
                throw new Error(`StatusCode=${result.res.statusCode}. Response isn't ClientError.\n${this.stringify(result.data)}`);
            }
            this.done(callback, result);
        });
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
            callback();
        }
        else {
            callback(result.data, result.res, result.req);
        }
    }
    stringify(data) {
        if (typeof (data) === "object") {
            return JSON.stringify(data);
        }
        return "" + data;
    }
    doTest(callback) {
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
        const req = request_1.default(requestOptions, (error, res, body) => {
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
        ret.assign(this.cookieJar, this.api, this.params, this.headers);
        return ret;
    }
    assign(cookieJar, api, params, headers) {
        this.cookieJar = cookieJar;
        this.api = api;
        this.params = params;
        this.headers = headers;
        this.request = request_1.default.defaults({ jar: cookieJar });
    }
}
exports.HttpClient = HttpClient;
