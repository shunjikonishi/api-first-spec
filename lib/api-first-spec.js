"use strict";
var 
  extend = require("extend"),
  URL = require("url"),
  querystring = require("querystring"),
  assert = require("chai").assert;

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

var Rules = {
  required: {
    value: "boolean",
    validate: function(b) {
      return function(v) {
        var isNull = (v === undefined || v === null || v === "");
        return !(b && isNull);
      };
    }
  },
  min: {
    value: "number",
    validate: function(n) {
      return function(v) {
        if (v !== 0 && !v) {
          return true;
        }
        return v >= n;
      };
    }
  },
  max: {
    value: "number",
    validate: function(n) {
      return function(v) {
        if (v !== 0 && !v) {
          return true;
        }
        return v <= n;
      };
    }
  },
  minlength: {
    value: "number",
    validate: function(n) {
      return function(v) {
        if (typeof(v) !== "string" || v === "") {
          return true;
        }
        return v.length >= n;
      };
    }
  },
  maxlength: {
    value: "number",
    validate: function(n) {
      return function(v) {
        if (typeof(v) !== "string" || v === "") {
          return true;
        }
        return v.length <= n;
      };
    }
  },
  pattern: {
    value: "string",
    validate: function(s) {
      return function(v) {
        var regex = new RegExp(s);
        return regex.test(s);
      };
    }
  },
  email: {
    value: "boolean",
    validate: function(b) {
      return function(v) {
        if (!v || !b) {
          return true;
        }
        var at = 0,
          atCode = "@".charCodeAt(0);
        for (var i=0; i<v.length; i++) {
          var c = v.charCodeAt(i);
          if (c > 128) {
            return false;
          }
          if (c === atCode) {
            at++;
          }
        }
        return at === 1;
      };
    }
  },
  url: {
    value: "boolean",
    validate: function(b) {
      return function(v) {
        if (!v || !b) {
          return true;
        }
        var url = URL.parse(v);
        return url.protocol && url.host;
      };
    }
  }
};

function defineGlobals() {
  Object.keys(Constants).forEach(function(key) {
    global[key] = Constants[key];
  });
}

function Rule(config) {

}

function Param(name, dataType, rules) {
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
  function testRequest() {
    var req = ("request" in config) ? config.request : {};
    req.contentType = ("contentType" in req) ? req.contentType : Constants.ContentType.URLENCODED;
    it("contentType is correct.", function() {
      testContentType(req.contentType);
    });
    if (req.params) {
      Object.keys(req.params).forEach(function(key) {
        var value = req.params[key],
          dataType = null,
          rules = {};
        switch (typeof(value)) {
          case "string":
            dataType = value;
            break;
          case "object":
            dataType = value.type || "string";
            if (value.rules) {
              rules = value.rules;
            }
            break;
          case "boolean":
            dataType = "string";
            break;
        }
        if (req.rules && req.rules[key]) {
          rules = extend(rules, req.rules[key]);
        }
        req.params[key] = new Param(key, dataType, rules);
      });
    }
  }
  describe("Validate API spec.", function() {
    it("endpoint is defined.", testEndpoint);
    it("method is correct.", testMethod);
    describe("Validate request spec.", testRequest);
  });
  extend(this, config);
}
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
      data = urlencode(config.data);
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
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
        if (body) {
          try {
            body = JSON.parse(body);
          } catch (e) {
            console.log("Unexpected error in parsing responsebody: " + e);
            console.log(body);
          }
        }
        callback(body, res);
        queue.shift();
        if (queue.length) {
          processQueue();
        }
      });
    });
    if (data) {
      req.write(data);
    }
    req.end();
  }
  var 
    con = ssl ? require("https") : require("http"),
    port = 80,
    cookie = null,
    queue = [];
  if (host.indexOf(":") != -1) {
    port = parseInt(host.split(":")[1], 10);
    host = host.split(":")[0];
  }
  extend(this, {
    "request": request
  });
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
