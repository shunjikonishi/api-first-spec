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
    return self;
  }
  function withParams(v) {
    params = v;
    return self;
  }
  function success(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isSuccess(data, res), "Response isn't success.");
      api.validateResponse(data, res, req);
      if (callback) {
        callback(data, res);
      }
    });
  }
  function badRequest(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isBadRequest(data, res), "Response isn't badRequest.");
      if (callback) {
        callback(data, res, req);
      }
    });
  }
  function notFound(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isNotFound(data, res), "Response isn't notFound.");
      if (callback) {
        callback(data, res, req);
      }
    });
  }
  function unauthorized(callback) {
    return doTest(function(data, res, req) {
      assert.ok(api.isUnauthorized(data, res), "Response isn't unauthorized.");
      if (callback) {
        callback(data, res, req);
      }
    });
  }
  function clientError(callback) {
    return doTest(function(data, res) {
      assert.ok(api.isClientError(data, res), "Response isn't clientError.");
      if (callback) {
        callback(data, res);
      }
    });
  }
  function doTest(callback) {
    function doCallback(data, res, req) {
      if (!callback) {
        return;
      }
      if (currentApi.response.contentType === "application/json") {
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
    queue.push({
      config: config,
      callback: callback
    });
    if (queue.length === 1) {
      processQueue();
    }
  }
  function processQueue() {
    if (queue.length === 0) {
      return;
    }
    var 
      config = queue[0].config,
      callback = queue[0].callback,
      data = null;

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
        try {
          if (callback) {
            callback(body, res);
          }
        } finally {
          queue.shift();
          if (queue.length) {
            processQueue();
          }
        }
      });
    });
    if (data) {
      req.write(data);
    }
    req.end();
  }
  var 
    self = this,
    con = ssl ? require("https") : require("http"),
    port = ssl ? 443 : 80,
    cookie = null,
    api = null,
    params = null,
    queue = [];
  if (host.indexOf(":") != -1) {
    port = parseInt(host.split(":")[1], 10);
    host = host.split(":")[0];
  }
  extend(this, {
    "api": withAPI,
    "params": withParams,
    "success": success,
    "badRequest": badRequest,
    "notFound": notFound,
    "unauthorized": unauthorized,
    "clientError": clientError,
    "request": request
  });
}

module.exports = HttpClient;