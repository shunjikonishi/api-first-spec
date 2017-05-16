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
  function buildCookie(cookie) {
    var ret = cookie;
    if (typeof(cookie) === "object") {
      ret = cookie[0];
    }
    var idx = ret.indexOf(" expires=");
    if (idx != -1) {
      ret = ret.substring(0, idx);
    }
    return ret;
  }
  function urlencode(params) {
    function getValue(value) {
      if (typeof(value) === "function") {
        value = value(params);
      }
      return querystring.escape(value);
    }
    if (typeof(params) === "function") {
      params = params();
    }
    var ret = "";
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var value = params[key];
        if (Array.isArray(value)) {
          for (var i=0; i<value.length; i++) {
            if (ret.length > 0) ret += "&";
            ret += querystring.escape(key) + "=" + getValue(value[i]);
          }
        } else {
          if (ret.length > 0) ret += "&";
          ret += querystring.escape(key) + "=" + getValue(value);
        }
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
  function success(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isSuccess(data, res), "Response isn't success.");
      api.validateResponse(data, res, req);
      done(callback, data, res, req);
    });
  }
  function badRequest(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isBadRequest(data, res), "Response isn't badRequest.");
      done(callback, data, res, req);
    });
  }
  function notFound(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isNotFound(data, res), "Response isn't notFound.");
      done(callback, data, res, req);
    });
  }
  function unauthorized(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isUnauthorized(data, res), "Response isn't unauthorized.");
      done(callback, data, res, req);
    });
  }
  function clientError(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isClientError(data, res), "Response isn't clientError.");
      done(callback, data, res, req);
    });
  }
  function doTest(callback) {
    function isJson(contentType) {
      if (!contentType) return false;
      var ct = contentType.toLowerCase();
      return ct.indexOf("/json") > 0 || ct.indexOf("+json") > 0;
    }
    function doCallback(data, res, req) {
      if (currentApi.verbose()) {
        console.log("**** Response Data ****");
        console.log("statusCode = " + res.statusCode);
        console.log("data = ");
        console.log(data);
      }
      if (!callback) {
        return;
      }
      var ct = res.headers["content-type"];
      if (isJson(ct)) {
        data = JSON.parse(data);
      }
      callback(data, res, req);
    }
    function buildEndpoint() {
      var ret = currentApi.endpoint;
      if (currentApi.urlParams) {
        currentApi.urlParams.forEach(function(key) {
          ret = ret.replace("[" + key + "]", currentParams[key]);
          delete currentParams[key];
        });
      }
      return ret;
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
    if (currentApi.request && currentApi.request.contentType) {
      requestParams.headers["Content-Type"] = currentApi.request.contentType;
    }
    request(requestParams, doCallback);
    return self;
  }
  function request(config, callback, log) {
    var data = null;

    config.headers = config.headers || {};

    if (config.method == "GET" && config.data && !config.params) {
      config.params = config.data;
      delete config.data;
    }
    if (config.data) {
      var ct = config.headers["Content-Type"];
      if (!ct) {
        ct = "application/x-www-form-urlencoded";
        config.headers["Content-Type"] = ct;
      }
      if (ct === "application/x-www-form-urlencoded") {
        data = urlencode(config.data);
      } else if (ct === "application/json") {
        data = toJson(config.data);
      }
      config.headers["Content-Length"] = data.length;
    }
    if (cookie) {
      config.headers.Cookie = buildCookie(cookie);
    }
    if (config.params) {
      config.path += "?" + urlencode(config.params);
    }
    if (config.log) {
      console.log("**** Request Data ****");
      console.log(config.path);
      if (data) {
        console.log(data);
      }
    }
    config.hostname = host;
    config.port = port;
    var req = con.request(config, function(res) {
      var body = "";
      res.setEncoding("utf-8");
      if (res.headers && res.headers["set-cookie"]) {
        cookie = res.headers["set-cookie"];
      }
      res.on("data", function(data) { body += data;});
      res.on("end", function() {
        if (callback) {
          callback(body, res, req);
        }
      });
    });
    req.on("error", function(e) {
      console.log("!!!!! error !!!!!", e);
    });
    if (data) {
      req.write(data);
    }
    req.end();
  }
  function copy() {
    var ret = new HttpClient(host + ":" + port, ssl, defaults);
    ret.assign(cookie, api, params, headers);
    return ret;
  }
  function assign(cookie_, api_, params_, headers_) {
    cookie = cookie_;
    api = api_;
    params = params_;
    headers = headers_;
  }
  var 
    self = this,
    con = ssl ? require("https") : require("http"),
    port = ssl ? 443 : 80,
    cookie = null,
    api = null,
    params = null,
    headers = null;

  // Initialize default parameter object
  defaults = defaults || {};
  defaults.params = defaults.params || {};
  defaults.headers = defaults.headers || {};

  if (host.indexOf(":") != -1) {
    port = parseInt(host.split(":")[1], 10);
    host = host.split(":")[0];
  }
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
    "clientError": clientError,
    "request": request,
    "assign": assign,
    "badRequestAll": badRequestAll
  });
}

module.exports = HttpClient;
