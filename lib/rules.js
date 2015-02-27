"use strict";
var 
  URL = require("url"),
  extend = require("extend"),
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
    invalidData: function(b, base) {
      return null;
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
    invalidData: function(b, base) {
      return null;
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
    invalidData: function(n, base) {
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
    invalidData: function(n, base) {
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
    invalidData: function(n, base) {
      return lengthedStr(n - 1, base);
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
    invalidData: function(n, base) {
      return lengthedStr(n + 1, base);
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
    invalidData: function(s, base) {
      return s;
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
    invalidData: function(b, base) {
      return "invalidemail";
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
    invalidData: function(b, base) {
      return "invalidurl";
    },
    message: "[NAME] must be valid url format."
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
  extend(this, {
    name: name,
    validate: validate,
    message: message
  });
}


module.exports = {
  testRule: function(name, value) {
    var 
      type = typeof(value),
      config = Rules[name];
    assert.ok(config, "Unknown rule: " + name);
    assert.ok(type === "function" || type === config.value, 
      "rules." + name + " must be function or " + config.value);
  },
  hasRule: function(key) {
    return !!Rules[key];
  },
  newInstance: function(name, param) {
    return new Rule(name, param, Rules[name]);
  }
};