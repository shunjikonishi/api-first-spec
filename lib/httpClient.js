"use strict";
var
  extend = require("extend"),
  querystring = require("querystring");

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

module.exports = HttpClient;