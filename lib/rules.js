"use strict";
var 
  URL = require("url");

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

module.exports = Rules;