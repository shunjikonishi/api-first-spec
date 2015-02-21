"use strict";
var 
  extend = require("extend"),
  util = require("util");

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
      var key = keys.shift();
      if (key === "*") {
        return p.childParams();
      }
      var ret = p.getChild(key);
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
        if (util.isArray(ret2)) {
          array.push.apply(array, ret2);
        } else if (ret2) {
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

module.exports = ParamPool;
