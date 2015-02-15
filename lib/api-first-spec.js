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
          it("Validate array parameter", function() {
            assert.equal(value.length, 1, 
              "The array in parameter definition must has only one element.");
          });
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
  function build() {
    describe("Validate " + name + " param.", function() {
      it("datatype", testDataType);
      var temp = [];
      Object.keys(rules).map(function(key) {
        if (key !== "format") {
          it("rule." + key, function() {
            var value = rules[key];
            Rules.testRule(key, value);
            temp.push(Rules.newInstance(key, value));
          });
        }
      });
      self.rules = temp;
      if (children) {
        Object.keys(children).forEach(function(key) {
          children[key].build();
        });
      }
    });
  }
  function testDataType() {
    if (dataType === "object" || dataType === "array") {
      return;
    }
    assert.ok(isValidDataType(dataType), "Invlaid datatype: " + name + ": " + dataType);
    if (dataType === "date") {
      format = rules.format || "YYYY-MM-DD";
    } else if (dataType === "datetime") {
      format = rules.format || "YYYY-MM-DD HH:mm:SS";
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
    var 
      dataNames = null,
      target = value;
    if (value) {
      if (isArray) {
        assert.ok(util.isArray(value), name + " must be array.");
        target = value.length > 0 ? value[0] : null;
      }
      if (target) {
        if (typeof(target) === "object") {
          if (util.iArray(target)) {
            dataNames = ["array"];
          } else {
            dataNames = Object.keys(target);
          }
        } else {
          assert.ok(validateType(target), 
            name + " must be " + (isArray ? "array of " : "") + dataType);
        }
      }
    }
    self.rules.forEach(function(rule) {
      assert.ok(rule.validate(value), 
        value + ": " + rule.message(name, value));
    });
    if (children && dataNames) {
      Object.keys(children).forEach(function(key) {
        var 
          p = children[key],
          v = removeElement(dataNames, key) ? target[key] : null;
        p.validate(v);
      });
    }
  }
  function addRules(v) {
    extend(rules, v);
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
    rules = {},
    children = null,
    format = null;

  init();

  extend(this, {
    "name": name,
    "type": dataType,
    "isArray": isArray,
    "build": build,
    "validate": validate,
    "addRules": addRules,
    "hasChildren": hasChildren,
    "childNames": childNames,
    "getChild": getChild
  });
}

function API(config) {
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

    var urlParams = config.endpoint.match(/\[[^\]]*\]/g);
    if (urlParams && urlParams.length > 0) {
      config.urlParams = urlParams.map(function(v) {
        return v.substring(1, v.length - 1);
      });
    }
  }
  function testMethod() {
    assert.ok(config.method, "method is not defined.");
    var values = Object.keys(Constants.Method).map(function(key) {
      return Constants.Method[key];
    });
    assert.include(values, config.method, "Invlaid method name: " + config.method);
  }
  function testParameters(params, rules, strict) {
    Object.keys(params).forEach(function(key) {
      var 
        p = new Param(key, params[key], strict);
      params[key] = p;
    });
    if (rules) {
      testRulesReference(params, rules);
    }
    Object.keys(params).forEach(function(key) {
      params[key].build();
    });
  }
  function testRulesReference(params, rules) {
    function buildNames(prefix, param) {
      var obj = names[param.name];
      if (!obj) {
        obj = [];
        names[param.name] = obj;
      }
      obj.push(param);
      if (prefix) {
        names[prefix + param.name] = [param];
      }
      if (param.hasChildren()) {
        param.childNames().forEach(function(key) {
          buildNames(prefix + param.name + ".", param.getChild(key));
        });
      }
    }
    var names = {};
    Object.keys(params).forEach(function(key) {
      buildNames("", params[key]);
    });
    it("Validate rules reference.", function() {
      var ret = [];
      Object.keys(rules).forEach(function(key) {
        var array = names[key];
        if (!array) {
          ret.push(key);
        } else {
          array.forEach(function(param) {
            param.addRules(rules[key]);
          });
        }
      });
      assert.ok(ret.length === 0, "Undefined parameters.: " + JSON.stringify(ret));
    });
  }
  function testRequest() {
    var req = ("request" in config) ? config.request : {};
    req.contentType = ("contentType" in req) ? req.contentType : Constants.ContentType.URLENCODED;
    it("contentType is correct.", function() {
      testContentType(req.contentType);
    });
    if (req.params) {
      testParameters(req.params, req.rules, !!req.strict);
    }
  }
  function testResponse() {
    it("response is defined.", function() {
      assert.ok(config.response, "response is not defined.");
    });
    var res = config.response;
    res.contentType = ("contentType" in res) ? res.contentType : Constants.ContentType.JSON;
    it("contentType is correct.", function() {
      testContentType(res.contentType);
    });
    it("data is defined.", function() {
      assert.ok(res.data, "data is not defined.");
    });
    testParameters(res.data, res.rules, !!res.strict);
  }
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
    Object.keys(config.response.data).forEach(function(name) {
      var param = config.response.data[name];
      param.validate(data[name]);
    });
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

  describe("Validate API spec. " + config.endpoint, function() {
    it("endpoint is correct.", testEndpoint);
    it("method is correct.", testMethod);
    describe("Validate request spec.", testRequest);
    describe("Validate response spec.", testResponse);

    it("Build API", function() {
      extend(self, config);
    });
  });
}

module.exports = extend({
  define: function(config) {
    return new API(config);
  },
  host: function(host, ssl) {
    return new HttpClient(host, ssl);
  }
}, Constants);
