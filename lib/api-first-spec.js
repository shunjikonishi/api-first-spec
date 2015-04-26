"use strict";
var 
  extend = require("extend"),
  util = require("util"),
  assert = require("chai").assert,
  DataType = require("./datatype"),
  Param = require("./param"),
  ParamPool = require("./paramPool"),
  HttpClient = require("./httpClient");

var SKIP_TEST = (process.env.API_FIRST_SPEC_SKIP_TEST || "false") != "false";
var VERBOSE = (process.env.API_FIRST_SPEC_VERBOSE || "false") != "false";

var Constants = {
  Method: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE"
  },
  ContentType: {
    JSON: "application/json",
    URLENCODED: "application/x-www-form-urlencoded",
    MULTIPART: "multipart/form-data"
  },
  DataType: Param.DataType
};

function API(config) {
  function isSuccess(data, res) {
    return res.statusCode >= 200 && res.statusCode < 300;
  }
  function isBadRequest(data, res) {
    return res.statusCode === 400;
  }
  function isNotFound(data, res) {
    return res.statusCode === 404;
  }
  function isUnauthorized(data, res) {
    return res.statusCode === 401;
  }
  function isClientError(data, res) {
    return res.statusCode >= 400 && res.statusCode < 500;
  }
  function validateResponse(data, res, req) {
    var resContentType = res.headers["content-type"];
    if (resContentType) {
      resContentType = resContentType.split(";")[0].trim().toLowerCase();
    }
    assert.equal(config.response.contentType, resContentType,
      "Content-Type is not match: " + resContentType);
    if (resContentType === Constants.ContentType.JSON) {
      var reqData = req.params || req.data;
      config.response.data.validate(data, data, reqData);
    }
  }
  function init() {
    function applyRules(param, rules) {
      var pool = new ParamPool(param);
      Object.keys(rules).forEach(function(key) {
        var array = pool.getParams(key);
        if (array) {
          array.forEach(function(p) {
            p.addRules(rules[key]);
          });
        }
      });
    }
    config.name = config.name || config.endpoint;
    var req = ("request" in config) ? config.request : {};
    req.contentType = ("contentType" in req) ? req.contentType : Constants.ContentType.URLENCODED;
    if (req.params) {
      req.params = new Param("request", req.params, !!req.strict);
      if (req.rules) {
        applyRules(req.params, req.rules);
      }
    }
    config.request = req;

    var res = config.response;
    if (res) {
      res.contentType = ("contentType" in res) ? res.contentType : Constants.ContentType.JSON;
      if (res.data) {
        res.data = new Param("response", res.data, !!res.strict);
        if (res.rules) {
          applyRules(res.data, res.rules);
        }
      }
    }
  }
  function test() {
    function testContentType(value) {
      var ret = false;
      Object.keys(Constants.ContentType).forEach(function(key) {
        if (Constants.ContentType[key] === value) {
          ret = true;
        }
      });
      assert.ok(ret, "Invlaid contentType: " + value);
    }
    function testEndpoint() {
      assert.ok(config.endpoint, "endpoint is not defined");
      assert.ok(config.endpoint.charAt(0) === "/", "endpoint must starts with '/'");
    }
    function testMethod() {
      assert.ok(config.method, "method is not defined.");
      var values = Object.keys(Constants.Method).map(function(key) {
        return Constants.Method[key];
      });
      assert.include(values, config.method, "Invlaid method name: " + config.method);
    }
    function testRulesReference(param, rules) {
      it("Validate rules reference.", function() {
        var 
          pool = new ParamPool(param),
          ret = [];
        Object.keys(rules).forEach(function(key) {
          if (!pool.getParams(key)) {
            ret.push(key);
          }
        });
        assert.ok(ret.length === 0, "Undefined parameters.: " + JSON.stringify(ret));
      });
    }
    function testRequest() {
      var req = config.request;
      it("contentType is correct.", function() {
        testContentType(req.contentType);
      });
      if (req.params) {
        req.params.test();
      }
      if (req.params && req.rules) {
        testRulesReference(req.params, req.rules);
      }
    }
    function testResponse() {
      var res = config.response;
      it("response is defined.", function() {
        assert.ok(res, "response is not defined.");
      });
      it("data is defined.", function() {
        assert.ok(res.data, "data is not defined.");
      });
      if (res.data) {
        res.data.test();
      }
      if (res.data && res.rules) {
        testRulesReference(res.data, res.rules);
      }
    }
    function testLogin() {
      var api = config.login;
      assert.equal("API", api.constructor.name, "login must be API object.");
    }
    function testUnknownKeys() {
      var 
        keys = [
          "name",
          "description",
          "endpoint",
          "method",
          "login",
          "request",
          "response",
          "isSuccess",
          "isBadRequest",
          "isNotFound",
          "isUnauthorized",
          "isClientError",
        ], 
        ret = [];
      Object.keys(config).forEach(function(key) {
        if (keys.indexOf(key) === -1) {
          ret.push(key);
        }
      });
      assert.ok(ret.length === 0, "config has unknown keys: " + JSON.stringify(ret));

    }
    describe("Validate API spec. " + config.name, function() {
      it("endpoint is correct.", testEndpoint);
      it("method is correct.", testMethod);
      describe("Validate request spec.", testRequest);
      describe("Validate response spec.", testResponse);
      if (config.login) {
        it("login is correct", testLogin);
      }
      it("unknown config keys", testUnknownKeys);
    });
  }
  function build() {
    if (config.endpoint) {
      var urlParams = config.endpoint.match(/\[[^\]]*\]/g);
      if (urlParams && urlParams.length > 0) {
        config.urlParams = urlParams.map(function(v) {
          return v.substring(1, v.length - 1);
        });
      }
    }
    if (config.request.params) {
      config.request.params.build();
    }
    if (config.response && config.response.data) {
      config.response.data.build();
    }
    extend(self, config);
  }
  var self = this;
  extend(self, {
    "isSuccess": isSuccess,
    "isBadRequest": isBadRequest,
    "isNotFound": isNotFound,
    "isUnauthorized": isUnauthorized,
    "isClientError": isClientError,
    "validateResponse": validateResponse,
    "skipTest": function() { return SKIP_TEST;},
    "verbose": function() { return VERBOSE;}
  });

  init();
  if (!SKIP_TEST) {
    test();
  }
  build();
}

module.exports = extend({
  define: function(config) {
    return new API(config);
  },
  host: function(host, ssl) {
    return new HttpClient(host, ssl);
  },
  skipTest: function(v) {
    if (typeof(v) === "boolean") {
      SKIP_TEST = v;
      return this;
    } else {
      return SKIP_TEST;
    }
  },
  verbose: function(v) {
    if (typeof(v) === "boolean") {
      VERBOSE = v;
      return this;
    } else {
      return VERBOSE;
    }
  }
}, Constants);
