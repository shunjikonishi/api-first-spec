"use strict";
var 
  extend = require("extend"),
  util = require("util"),
  assert = require("chai").assert,
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

function defineGlobals() {
  Object.keys(Constants).forEach(function(key) {
    global[key] = Constants[key];
  });
}

function Rule(config) {

}

function Param(name, dataType, isArray, rules) {
  function testDataType() {
    var values = Object.keys(Constants.DataType).map(function(key) {
      return Constants.DataType[key];
    });
    assert.include(values, dataType, "Invlaid datatype: " + name + ": " + dataType);
    if (dataType === "date") {
      format = rules.format || "YYYY-MM-DD";
    } else if (dataType === "datetime") {
      format = rules.format || "YYYY-MM-DD HH:mm:SS";
    }
  }
  function testRule(name, value) {
    var 
      type = typeof(value),
      config = Rules[name];
    assert.ok(config, "Unknown rule: " + name);
    assert.ok(type === "function" || type === config.value, 
      "rules." + name + " must be function or " + config.value);
  }
  var 
    self = this,
    format = null;
  describe("Validate " + name + " param.", function() {
    it("datatype", testDataType);
    var temp = [];
    Object.keys(rules).map(function(key) {
      if (key !== "format") {
        it("rule." + key, function() {
          testRule(key, rules[key]);
          temp.push(new Rule(Rules[key]));
        });
      }
    });
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
  }
  function testMethod() {
    assert.ok(config.method, "method is not defined.");
    var values = Object.keys(Constants.Method).map(function(key) {
      return Constants.Method[key];
    });
    assert.include(values, config.method, "Invlaid method name: " + config.method);
  }
  function testParameters(params, rules) {
    if (rules) {
      testRulesReference("Validate rules reference.", params, rules);
    }
    Object.keys(params).forEach(function(key) {
      var value = params[key],
        dataType = null,
        isArray = false,
        rule = {};
      switch (typeof(value)) {
        case "string":
          dataType = value;
          break;
        case "object":
          if (util.isArray(value)) {
            isArray = true;
            it("Validate array parameter", function() {
              assert.equal(value.length, 1, 
                "The array in parameter definition must has only one element.");
            });
            dataType = value[0];
          }
          //ToDo nested object
          break;
      }
      if (rules && rules[key]) {
        rule = rules[key];
      }
      params[key] = new Param(key, dataType, isArray, rule);
    });
  }
  function testRulesReference(description, names, rules) {
    it(description, function() {
      Object.keys(rules).forEach(function(key) {
        assert.ok(names && names[key], "Parameter name is not defined.: " + key);
      });
    });
  }
  function testRequest() {
    var req = ("request" in config) ? config.request : {};
    req.contentType = ("contentType" in req) ? req.contentType : Constants.ContentType.URLENCODED;
    it("contentType is correct.", function() {
      testContentType(req.contentType);
    });
    if (req.params) {
      testParameters(req.params, req.rules);
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
    testParameters(res.data, res.rules);

  }
  describe("Validate API spec.", function() {
    it("endpoint is correct.", testEndpoint);
    it("method is correct.", testMethod);
    describe("Validate request spec.", testRequest);
    describe("Validate response spec.", testResponse);
  });
  extend(this, config);
}

module.exports = extend({
  defineGlobals: defineGlobals,
  define: function(config) {
    return new API(config);
  },
  createHttpClient: function(host, ssl) {
    return new HttpClient(host, ssl);
  }
}, Constants);
