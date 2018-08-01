"use strict";
const api_1 = require("./api");
const datatype_1 = require("./datatype");
const httpClient_1 = require("./httpClient");
class ApiFirstSpec {
    constructor() {
        this._skipTest = (process.env.API_FIRST_SPEC_SKIP_TEST || "false") !== "false";
        this._verbose = (process.env.API_FIRST_SPEC_VERBOSE || "false") !== "false";
    }
    define(config) {
        const api = new api_1.API(config);
        api.verbose(this._verbose);
        if (!this._skipTest) {
            if ("describe" in global && "it" in global) {
                describe("Verify API definition", () => {
                    it(api.name, () => {
                        api.test();
                    });
                });
            }
            else {
                api.test();
            }
        }
        return api;
    }
    host(hostName, ssl, defaults) {
        return new httpClient_1.HttpClient(hostName, ssl, defaults);
    }
    skipTest(v) {
        if (typeof v === "boolean") {
            this._skipTest = v;
            return this;
        }
        else {
            return this._skipTest;
        }
    }
    verbose(v) {
        if (typeof v === "boolean") {
            this._verbose = v;
            return this;
        }
        else {
            return this._verbose;
        }
    }
    get DataType() {
        return datatype_1.DataType;
    }
    get ContentType() {
        return api_1.ContentType;
    }
    get Method() {
        return api_1.Method;
    }
}
module.exports = new ApiFirstSpec();
