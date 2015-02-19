"use strict";
var 
  extend = require("extend"),
  util = require("util"),
  assert = require("chai").assert,
  moment = require("moment"),
  Rules = require("./rules"),
  HttpClient = require("./httpClient");

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
  DataType: {
    STRING: "string",
    INT: "int",
    NUMBER: "number",
    BOOLEAN: "boolean",
    DATE: "date",
    DATETIME: "datetime",
    BIT: "bit"
  }
};

function removeElement(array, obj) {
  var n = array.indexOf(obj);
  if (n === -1) {
    return false;
  }
  array.splice(n, 1);
  return true;
}

function isValidDataType(type) {
  var ret = Object.keys(Constants.DataType).filter(function(key) {
    return Constants.DataType[key] === type;
  });
  return ret.length > 0;
}

function ParamPool(param) {
  function build(p) {
    if (p.hasChildren()) {
      p.childNames().forEach(function(name) {
        var 
          child = p.getChild(name),
          array = map[name];
        if (!array) {
          array = [];
          map[name] = array;
        }
        array.push(child);
        build(child);
      });
    }
  }
  function getAllParams() {
    var ret = [];
    Object.keys(map).forEach(function(key) {
      ret.push.apply(ret, map[key]);
    });
    return ret;
  }
  function getParams(key) {
    function doGet(p, keys) {
      var ret = p.getChild(keys.shift());
      if (!ret) {
        return null;
      } else if (keys.length === 0) {
        return ret;
      } else {
        return doGet(ret, keys);
      }
    }
    if (key === "*") {
      return getAllParams();
    }
    var 
      keys = key.split("."),
      ret = map[keys.shift()];
    if (!ret) {
      return null;
    } else if (keys.length === 0) {
      return ret;
    } else {
      var array = [];
      ret.forEach(function(p) {
        var ret2 = doGet(p, [].concat(keys));
        if (ret2) {
          array.push(ret2);
        }
      });
      return array.length > 0 ? array : null;
    }
  }
  var map = {};
  build(param);
  extend(this, {
    getParams: getParams
  });
}

function Param(name, value, strict) {
  function init() {
    switch (typeof(value)) {
      case "string":
        dataType = value;
        break;
      case "object":
        var obj = value;
        if (util.isArray(value)) {
          isArray = true;
          obj = value[0];
        } else {
          dataType = "object";
        }
        if (typeof(obj) === "string") {
          dataType = obj;
        } else if (util.isArray(obj)) {
          dataType = "array";
          children = {
            "array": new Param("array", obj, strict)
          };
        } else {
          dataType = "object";
          children = {};
          Object.keys(obj).forEach(function(key) {
            children[key] = new Param(key, obj[key], strict);
          });
        }
        break;
    }
  }
  function test() {
    function testDataType() {
      if (dataType === "object" || dataType === "array") {
        return;
      }
      assert.ok(isValidDataType(dataType), "Invalid datatype: " + name + ": " + dataType);
    }
    function testArray() {
      assert.equal(value.length, 1, 
        "The array in parameter definition must has only one element.");
    }
    function testRules() {
      Object.keys(tempRules).map(function(key) {
        if (key !== "format") {
          it("rule." + key, function() {
            var value = tempRules[key];
            Rules.testRule(key, value);
          });
        }
      });
    }
    describe("Validate " + name + " param.", function() {
      it("datatype", testDataType);
      if (isArray) {
        it("array", testArray);
      }
      describe("rules", testRules);
      if (children) {
        Object.keys(children).forEach(function(key) {
          children[key].test();
        });
      }
    });
  }
  function build() {
    if (dataType === "date") {
      format = rules.format || "YYYY-MM-DD";
    } else if (dataType === "datetime") {
      format = rules.format || "YYYY-MM-DD HH:mm:SS";
    }
    Object.keys(tempRules).map(function(key) {
      if (key !== "format") {
        if (Rules.hasRule(key)) {
          rules.push(Rules.newInstance(key, tempRules[key]));
        }
      }
    });
    if (children) {
      Object.keys(children).forEach(function(key) {
        children[key].build();
      });
    }
  }
  function validateType(value) {
    var type = typeof(value);
    switch (dataType) {
      case Constants.DataType.STRING:
      case Constants.DataType.NUMBER:
      case Constants.DataType.BOOLEAN:
        return type === dataType;
      case Constants.DataType.INT:
        return type === "number" && Math.floor(value) === value;
      case Constants.DataType.DATE:
      case Constants.DataType.DATETIME:
        var d = moment(value);
        return d && d.format(format) === value;
      case Constants.DataType.BIT:
        return value == "0" || value == "1";
    }
    return false;
  }
  function validate(value) {
    var target = [value];
    if (value) {
      if (isArray) {
        assert.ok(util.isArray(value), name + " must be array.");
        target = value;
      }
    }
    target.forEach(function(obj) {
      var dataNames = null;
      if (typeof(obj) === "object") {
        if (util.isArray(obj)) {
          dataNames = ["array"];
        } else if (obj !== null) {
          dataNames = Object.keys(obj);
        }
      } else {
        assert.ok(validateType(obj), 
          obj + ": " + name + " must be " + (isArray ? "array of " : "") + dataType);
      }
      self.rules.forEach(function(rule) {
        assert.ok(rule.validate(obj), 
          obj + ": " + rule.message(name, obj));
      });
      if (children && dataNames) {
        Object.keys(children).forEach(function(key) {
          var 
            p = children[key],
            v = removeElement(dataNames, key) ? obj[key] : null;
          p.validate(v);
        });
        if (strict) {
          assert.ok(dataNames.length === 0, "Unknown keys: " + JSON.stringify(dataNames));
        }
      }
    });
  }
  function addRules(v) {
    extend(tempRules, v);
  }
  function hasChildren() {
    return !!children;
  }
  function childNames() {
    return Object.keys(children);
  }
  function getChild(name) {
    return children ? children[name] : null;
  }
  var 
    self = this,
    dataType = null,
    isArray = false,
    tempRules = {},
    rules = [],
    children = null,
    format = null;

  init();

  extend(this, {
    "name": name,
    "type": dataType,
    "isArray": isArray,
    "build": build,
    "test": test,
    "validate": validate,
    "addRules": addRules,
    "rules": rules,
    "hasChildren": hasChildren,
    "childNames": childNames,
    "getChild": getChild
  });
}

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
    assert.equal(config.response.contentType, resContentType,
      "Content-Type is not match: " + resContentType);
    if (resContentType === Constants.ContentType.JSON) {
      config.response.data.validate(data);
    }
  }
  function init() {
    function applyRules(param, rules) {
      var pool = new ParamPool(param);
      Object.keys(rules).forEach(function(key) {
        var array = pool.getParams(key);
        if (array) {
          array.forEach(function(p) {
console.log("***** Rule: " + p.name + ", " + key);
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
    "validateResponse": validateResponse
  });

  init();
  test();
  build();
}

module.exports = extend({
  define: function(config) {
    return new API(config);
  },
  host: function(host, ssl) {
    return new HttpClient(host, ssl);
  }
}, Constants);
