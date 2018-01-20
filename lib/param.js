"use strict";
var 
  extend = require("extend"),
  util = require("util"),
  moment = require("moment"),
  assert = require("chai").assert,
  DataType = require("./datatype"),
  Rules = require("./rules");

function removeElement(array, obj) {
  var n = array.indexOf(obj);
  if (n === -1) {
    return false;
  }
  array.splice(n, 1);
  return true;
}

function isValidDataType(type) {
  var ret = Object.keys(DataType).filter(function(key) {
    return DataType[key] === type;
  });
  return ret.length > 0;
}


function Param(name, value, strict, prefix) {
  function fullname() {
    return prefix ? prefix + name : name;
  }
  function createChild(name, value) {
    var nextPrefix = fullname() + ".";
    if (typeof(prefix) === "boolean" && prefix === false) {
      nextPrefix = "";
    }
    return new Param(name, value, strict, nextPrefix);
  }
  function init() {
    if (typeof(value) === "string") {
      const array = value.split(",").map(v => v.trim());
      value = array.shift();
      if (array.length > 0) {
        const rules = {};
        array.forEach(v => {
          const kv = v.split("=").map(v => v.trim());
          const key = kv[0];
          let value = kv[1] || "true";
          const rule = Rules.getRule(key);
          if (rule) {
            switch (rule.value) {
              case "number":
                value = Number(value);
                break;
              case "boolean":
                value = value === "true";
                break;
            }
          }
          rules[key] = value;
        });
        addRules(rules);
      }
    }
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
            "array": createChild("array", obj)
          };
        } else {
          dataType = "object";
          children = {};
          Object.keys(obj).forEach(function(key) {
            children[key] = createChild(key, obj[key]);
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
      assert.ok(isValidDataType(dataType), "Invalid datatype: " + fullname() + ": " + dataType);
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
    describe("Validate " + fullname() + " param.", function() {
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
      format = tempRules.format || "YYYY-MM-DD";
    } else if (dataType === "datetime") {
      format = tempRules.format || "YYYY-MM-DD HH:mm:SS";
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
    if (value === null || value === undefined) {
      return true;
    }
    var type = typeof(value);
    switch (dataType) {
      case DataType.ANY:
        return true;
      case DataType.STRING:
      case DataType.NUMBER:
      case DataType.BOOLEAN:
        return type === dataType;
      case DataType.INT:
        return type === "number" && Math.floor(value) === value;
      case DataType.DATE:
      case DataType.DATETIME:
        var d = moment(value);
        return d && moment(d.format(format), format).utcOffset() == d.utcOffset();
      case DataType.BIT:
        return value == "0" || value == "1";
    }
    return false;
  }
  function generateInvalidTypeValue() {
    switch (dataType) {
      case DataType.STRING:
        return null;
      case DataType.NUMBER:
      case DataType.BOOLEAN:
      case DataType.INT:
      case DataType.DATE:
      case DataType.DATETIME:
        return "xyz";
      case DataType.BIT:
        return "2";
    }
    return null;
  }
  function validate(value, data, reqData) {
    var target = [value];
    if (value) {
      if (isArray) {
        assert.ok(util.isArray(value), fullname() + " must be array.");
        target = value;
      }
    }
    target.forEach(function(obj) {
      var dataNames = null;
      if (hasChildren() && typeof(obj) === "object") {
        if (util.isArray(obj)) {
          dataNames = ["array"];
        } else if (obj !== null) {
          dataNames = Object.keys(obj);
        }
      } else {
        assert.ok(validateType(obj), 
          obj + ": " + fullname() + " must be " + (isArray ? "array of " : "") + dataType);
      }
      self.rules.forEach(function(rule) {
        assert.ok(rule.validate(obj, data, reqData), 
          obj + ": " + rule.message(fullname(), obj));
      });
      if (hasChildren() && dataNames) {
        Object.keys(children).forEach(function(key) {
          var 
            p = children[key],
            v = removeElement(dataNames, key) ? obj[key] : null;
          p.validate(v, data, reqData);
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
  function hasRule(name) {
    return rules.filter(function(rule) {
      return rule.name == name;
    }).length > 0;
  }
  function hasChildren() {
    return childNames().length > 0;
  }
  function childNames() {
    return children ? Object.keys(children) : [];
  }
  function childParams() {
    return childNames().map(function(key) {
      return children[key];
    });
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
    "generateInvalidTypeValue": generateInvalidTypeValue,
    "addRules": addRules,
    "hasRule": hasRule,
    "rules": rules,
    "hasChildren": hasChildren,
    "childNames": childNames,
    "childParams": childParams,
    "getChild": getChild
  });
}

module.exports = Param;
