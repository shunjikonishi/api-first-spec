"use strict";
var
  extend = require("extend"),
  querystring = require("querystring"),
  objectPath = require("object-path"),
  util = require("util"),
  assert = require("chai").assert;


/**
 * Generates http client; wrapper of http/https library.
 *
 * `defaults` expect have two keys: params and headers
 *
 * @param {string} host
 * @param {boolean} ssl use to switch using `https` and `http`
 * @param {object} defaults will set unmodifiable default value
 * @return {object}
 */
function HttpClient(host, ssl, defaults) {
  function normalizeData(params) {
    function getValue(value) {
      if (typeof(value) === "function") {
        value = value(params);
      }
      return querystring.escape(value);
    }
    if (typeof(params) === "function") {
      params = params();
    }
    var ret = {};
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var value = params[key];
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
  function toJson(params) {
    function normalize(p) {
      var 
        type = typeof(p),
        ret = p;
      if (type === "function") {
        p = p();
        type = typeof(p); 
      }
      if (type === "object") {
        if (Array.isArray(p)) {
          ret = [];
          for (var i=0; i<p.length; i++) {
            ret.push(normalize(p[i]));
          }
        } else {
          ret = {};
          for (var key in p) {
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
  function withAPI(v) {
    api = v;
    return this;
  }
  function withParams(v) {
    params = v;
    return this;
  }
  function withHeaders(v) {
    headers = v;
    return this;
  }
  function done(callback, data, res, req) {
    function isDone(func) {
      return callback.toString().indexOf("done() invoked with non-Error") !== -1;
    }
    if (!callback) {
      return;
    }
    if (isDone(callback)) {
      callback();
    } else {
      callback(data, res, req);
    }
  }
  function login(params) {
    return self.api(api.login).params(params);
  }
  function stringify(data) {
    if (typeof(data) === "object") {
      return JSON.stringify(data);
    }
    return "" + data;
  }
  function success(callback) {
    return doTest(function(data, res, req) {
      assert(api.isSuccess(data, res), `StatusCode=${res.statusCode}. Response isn't Success.\n${stringify(data)}`);
      api.validateResponse(data, res, req);
      done(callback, data, res, req);
    });
  }
  function badRequest(callback) {
    return doTest(function(data, res, req) {
      assert(api.isBadRequest(data, res), `StatusCode=${res.statusCode}. Response isn't BadRequest.\n${stringify(data)}`);
      done(callback, data, res, req);
    });
  }
  function notFound(callback) {
    return doTest(function(data, res, req) {
      assert(api.isNotFound(data, res), `StatusCode=${res.statusCode}. Response isn't NotFound.\n${stringify(data)}`);
      done(callback, data, res, req);
    });
  }
  function unauthorized(callback) {
    return doTest(function(data, res, req) {
      assert(api.isUnauthorized(data, res), `StatusCode=${res.statusCode}. Response isn't Unauthorized.\n${stringify(data)}`);
      done(callback, data, res, req);
    });
  }
  function forbidden(callback) {
    return doTest(function(data, res, req) {
      assert(api.isForbidden(data, res), `StatusCode=${res.statusCode}. Response isn't Forbidden.\n${stringify(data)}`);
      done(callback, data, res, req);
    });
  }
  function clientError(callback) {
    return doTest(function(data, res, req) {
      assert(api.isClientError(data, res), `StatusCode=${res.statusCode}. Response isn't ClientError.\n${stringify(data)}`);
      done(callback, data, res, req);
    });
  }
  function doTest(callback) {
    return new Promise((resolve, reject) => {
      function isJson(contentType) {
        if (!contentType) return false;
        var ct = contentType.toLowerCase();
        return ct.indexOf("/json") > 0 || ct.indexOf("+json") > 0;
      }
      function buildEndpoint() {
        var ret = currentApi.endpoint;
        if (currentApi.urlParams) {
          currentApi.urlParams.forEach(function(key) {
            ret = ret.replace("[" + key + "]", currentParams[key]);
            delete currentParams[key];
          });
        }
        return (ssl ? "https" : "http") + "://" + host + ret;
      }
      function doCallback(data, res, req) {
        if (currentApi.verbose()) {
          console.log("**** Response Data ****");
          console.log("statusCode = " + res.statusCode);
          console.log("data = ");
          console.log(data);
        }
        if (!callback) {
          resolve(data, res, req);
          return;
        }
        var ct = res.headers["content-type"];
        if (isJson(ct)) {
          data = JSON.parse(data);
        }
        callback(data, res, req);
        resolve(data, res, req);
      }
      var 
        currentApi = api,
        currentParams = extend({}, defaults.params, params),
        currentHeaders = extend({}, defaults.headers, headers);
      params = null;
      headers = null;
      if (!currentApi) {
        throw "api isn't set.";
      }
      var requestParams = {
        "method": currentApi.method,
        "headers": currentHeaders,
        "path": buildEndpoint(),
        "data": Object.keys(currentParams).length > 0 ? currentParams : null,
        "log": currentApi.verbose()
      };
      if (currentApi.request && currentApi.request.headers) {
        extend(requestParams.headers, currentApi.request.headers);
      }
      if (currentApi.request && currentApi.request.contentType) {
        requestParams.headers["Content-Type"] = currentApi.request.contentType;
      }
      doRequest(requestParams, doCallback);
    });
  }
  function doRequest(config, callback, log) {
    var requestOptions = {
      method: config.method,
      headers: config.headers || {},
      url: config.path
    };

    config.headers = config.headers || {};

    if (config.method == "GET" && config.data) {
      requestOptions.qs = config.data;
    } else if (config.data) {
      var ct = config.headers["Content-Type"];
      if (!ct) {
        ct = "application/x-www-form-urlencoded";
        requestOptions.headers["Content-Type"] = ct;
      }
      if (ct === "application/x-www-form-urlencoded") {
        requestOptions.form = normalizeData(config.data);
      } else if (ct === "multipart/form-data") {
        const formData = {};
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
        requestOptions.body = toJson(config.data);
      }
    }
    if (config.log) {
      console.log("**** Request Data ****");
      console.log(`${config.method} ${config.path}`);
      if (config.data) {
        console.log(JSON.stringify(config.data));
      }
    }
    var req = request(requestOptions, function(error, res, body) {
      if (error) {
        console.log("!!!!! error !!!!!", error, res, body);
        return;
      }
      callback(body, res, req);
    });
  }
  function copy() {
    var ret = new HttpClient(host, ssl, defaults);
    ret.assign(cookieJar, api, params, headers);
    return ret;
  }
  function assign(cookieJar, api_, params_, headers_) {
    cookieJar = cookieJar;
    api = api_;
    params = params_;
    headers = headers_;
    request = request.defaults({ jar: cookieJar});
  }
  var 
    self = this,
    request = require("request"),
    cookieJar = request.jar(),
    api = null,
    params = null,
    headers = null;

  request = request.defaults({ jar: cookieJar});

  // Initialize default parameter object
  defaults = defaults || {};
  defaults.params = defaults.params || {};
  defaults.headers = defaults.headers || {};

  function badRequestAll(runDefaults, optionParams) {
    function doIt(desc, data) {
      it(desc, function(done) {
        copy().params(data).badRequest(done);
      });
    }
    function processValue(desc, key, value) {
      var 
        data = extend({}, params),
        orgValue = objectPath.get(data, key);
      if (util.isArray(orgValue)) {
        orgValue[0] = value;
      } else {
        objectPath.set(data, key, value);
      }
      doIt(desc, data);
    }
    function process(prefix, reqParams) {
      reqParams.forEach(function(p) {
        var 
          fullName = prefix ? prefix + "." + p.name : p.name,
          options = {};
        if (p.hasRule("email")) {
          options.email = true;
        }
        if (p.hasRule("url")) {
          options.url = true;
        }
        if (runDefaults) {
          var invalidTypeValue = p.generateInvalidTypeValue();
          if (invalidTypeValue) {
            processValue(fullName + " - invalid datatype(" + invalidTypeValue + ")", 
              fullName, invalidTypeValue);
          }
          p.rules.forEach(function(r) {
            var data = r.generateBadRequest(fullName, params, options);
            if (data) {
              doIt(fullName + " - " + r.name　+ "(" + objectPath.get(data, fullName) + ")", data);
            }
          });
        }
        var optionValue = objectPath.get(optionParams, fullName);
        if (optionValue) {
          if (util.isArray(optionValue)) {
            optionValue.forEach(function(v) {
              processValue(fullName + " - " + v, fullName, v);
            });
          } else {
            processValue(fullName + " - " + optionValue, fullName, optionValue);
          }
        }
        process(fullName, p.childParams());

      });
    }
    if (!api || !params) {
      throw "Must specify api and params";
    }
    switch (arguments.length) {
      case 0:
        runDefaults = true;
        optionParams = {};
        break;
      case 1:
        if (typeof(runDefaults) === "object") {
          optionParams = runDefaults;
          runDefaults = true;
        }
        break;
    }
    optionParams = optionParams || {};
    describe("BadRequest test for", function() {
      process("", api.request.params.childParams());
    });
  }
  extend(this, {
    "api": withAPI,
    "params": withParams,
    "headers": withHeaders,
    "login": login,
    "success": success,
    "badRequest": badRequest,
    "notFound": notFound,
    "unauthorized": unauthorized,
    "forbidden": forbidden,
    "clientError": clientError,
    "request": doRequest,
    "assign": assign,
    "badRequestAll": badRequestAll
  });
}

module.exports = HttpClient;
