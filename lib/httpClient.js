"use strict";
var
  extend = require("extend"),
  querystring = require("querystring"),
  assert = require("chai").assert;

function HttpClient(host, ssl) {
  function buildCookie(cookie) {
    var ret = cookie;
    if (typeof(cookie) === "object") {
      ret = cookie.filter(function(str) {
        return str.indexOf("fuelcid=") != -1;
      })[0];
    }
    var idx = ret.indexOf(" expires=");
    if (idx != -1) {
      ret = ret.substring(0, idx);
    }
    return ret;
  }
  function urlencode(params) {
    var ret = "";
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var value = params[key];
        if (Array.isArray(value)) {
          for (var i=0; i<value.length; i++) {
            if (ret.length > 0) ret += "&";
            ret += querystring.escape(key) + "=" + querystring.escape(value[i]);
          }
        } else {
          if (ret.length > 0) ret += "&";
          ret += querystring.escape(key) + "=" + querystring.escape(value);
        }
      }
    }
    return ret;
  }
  function withAPI(v) {
    api = v;
    return copy();
  }
  function withParams(v) {
    params = v;
    return copy();
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
      if (callback) {
        callback(data, res, req);
      }
    });
  }
  function doTest(callback) {
    function doCallback(data, res, req) {
      if (!callback) {
        return;
      }
      var ct = res.headers["content-type"];
      if (ct && ct.toLowerCase().indexOf("application/json") === 0) {
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
      currentParams = extend({}, params);
    params = null;
    if (!currentApi) {
      throw "api isn't set.";
    }
    request({
      "method": currentApi.method,
      "path": buildEndpoint(),
      "data": Object.keys(currentParams).length > 0 ? currentParams : null
    }, doCallback);
    return self;
  }
  function request(config, callback) {
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
        data = JSON.stringify(config.data);
      }
      config.headers["Content-Length"] = data.length;
    }
    if (cookie) {
      config.headers.Cookie = buildCookie(cookie);
    }
    if (config.params) {
      config.path += "?" + urlencode(config.params);
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
    if (data) {
      req.write(data);
    }
    req.end();
  }
  function copy() {
    var ret = new HttpClient(host + ":" + port, ssl);
    ret.assign(cookie, api, params);
    return ret;
  }
  function assign(cookie_, api_, params_) {
    cookie = cookie_;
    api = api_;
    params = params_;
  }
  var 
    self = this,
    con = ssl ? require("https") : require("http"),
    port = ssl ? 443 : 80,
    cookie = null,
    api = null,
    params = null;
  if (host.indexOf(":") != -1) {
    port = parseInt(host.split(":")[1], 10);
    host = host.split(":")[0];
  }
  extend(this, {
    "api": withAPI,
    "params": withParams,
    "login": login,
    "success": success,
    "badRequest": badRequest,
    "notFound": notFound,
    "unauthorized": unauthorized,
    "clientError": clientError,
    "request": request,
    "assign": assign
  });
}

module.exports = HttpClient;