"use strict";
var 
  URL = require("url"),
  extend = require("extend"),
  objectPath = require("object-path"),
  util = require("util"),
  assert = require("chai").assert;

function lengthedStr(n, base) {
  if (!base) {
    base = "12345678901234567890123456789012345678901234567890";
  }
  var ret = base;
  while (ret.length < n) {
    ret += base;
  }
  return ret.substring(0, n);
}
var Rules = {
  required: {
    value: "boolean",
    validate: function(b) {
      return function(v) {
        var isNull = (v === undefined || v === null || v === "");
        return !(b && isNull);
      };
    },
    invalidData: function(b) {
      throw "Not supported";
    },
    message: "[NAME] is required."
  },
  requiredAllowEmptyString: {
    value: "boolean",
    validate: function(b) {
      return function(v) {
        var isNull = (v === undefined || v === null);
        return !(b && isNull);
      };
    },
    invalidData: function(b) {
      throw "Not supported";
    },
    message: "[NAME] is required."
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
    },
    invalidData: function(n) {
      return n - 1;
    },
    message: "[NAME] must be equal or greater than [PARAM]."
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
    },
    invalidData: function(n) {
      return n + 1;
    },
    message: "[NAME] must be equal or less than [PARAM]."
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
    },
    invalidData: function(n) {
      return lengthedStr(n - 1);
    },
    message: "The length of [NAME] must be equal or greater than [PARAM]."
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
    },
    invalidData: function(n, options) {
      var ret = lengthedStr(n + 1);
      if (options) {
        if (options.url) {
          ret = "http://www.example.com/" + ret;
          ret = ret.substring(0, n + 1);
        } else if (options.email) {
          ret += "@example.com";
          ret = ret.substring(ret.length - (n + 1));
        }
      }
      return ret;
    },
    message: "The length of [NAME] must be equal or less than [PARAM]."
  },
  pattern: {
    value: "string",
    validate: function(s) {
      return function(v) {
        if (v === null || v === undefined) {
          return true;
        }
        var regex = new RegExp(s);
        return regex.test(v);
      };
    },
    invalidData: function(s) {
      return null;
    },
    message: "[NAME] must be match with pattern /[PARAM]/."
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
    },
    invalidData: function(b) {
      return b ? "invalidemail" : null;
    },
    message: "[NAME] must be valid email format."
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
    },
    invalidData: function(b) {
      return b ? "invalidurl" : null;
    },
    message: "[NAME] must be valid url format."
  },
  list: {
    value: "array",
    validate: function(array) {
      return function(v) {
        if (v === undefined || v === null) {
          return true;
        }
        return array.indexOf(v) !== -1;
      };
    },
    invalidData: function(array) {
      var ret = array[0] + 1;
      while(array.indexOf(ret) !== -1) {
        ret += 1;
      }
      return ret;
    },
    message: "[NAME] must be one of [[PARAM]]."
  }
};

function Rule(name, param, config) {
  function message(name, value) {
    var ret = config.message;
    ret = ret.replace("[NAME]", name);
    ret = ret.replace("[PARAM]", param);
    ret = ret.replace("[VALUE]", value);
    return ret;
  }
  function validate(value, data, reqData) {
    var ruleParam = param;
    if (typeof(param) === "function") {
      ruleParam = param(data, reqData);
    }
    var func = config.validate(ruleParam);
    return func(value);
  }
  function generateBadRequest(key, data, options) {
    var orgValue = objectPath.get(data, key);
    if (orgValue === null || orgValue === undefined) {
      return null;
    }
    var 
      ret = extend({}, data),
      ruleParam = param;
    if (typeof(param) === "function") {
      ruleParam = param(data);
    }
    if (isRequired()) {
      objectPath.del(ret, key);
      return ruleParam ? ret : null;
    }
    var value = config.invalidData(ruleParam, options);
    if (value === null) {
      return null;
    }
    if (util.isArray(orgValue)) {
      objectPath.get(ret, key)[0] = value;
    } else {
      objectPath.set(ret, key, value);
    }
    return ret;
  }
  function isRequired() {
    return name == "required" || name == "requiredAllowEmptyString";
  }
  extend(this, {
    name: name,
    param: param,
    validate: validate,
    message: message,
    generateBadRequest: generateBadRequest
  });
}


module.exports = {
  testRule: function(name, value) {
    var 
      type = typeof(value),
      config = Rules[name];
    if (type === "object" && util.isArray(value)) {
      type = "array";
    }
    assert.ok(config, "Unknown rule: " + name);
    assert.ok(type === "function" || type === config.value, 
      "rules." + name + " must be function or " + config.value);
  },
  hasRule: function(key) {
    return !!Rules[key];
  },
  getRule: function(key) {
    return Rules[key];
  },
  newInstance: function(name, param) {
    return new Rule(name, param, Rules[name]);
  }
};