"use strict";
var 
  assert = require("chai").assert,
  spec = require("../lib/api-first-spec"),
  props = require("./env/properties.json");

spec.defineGlobals();

var API = spec.define({
  "endpoint": "/api/companies/signin",
  "method": "POST",
  "request": {
    "contentType": ContentType.URLENCODED,
    "params": {
      "email": {
        "type": DataType.STRING,
        "rules": {
          "required": true
        }
      },
      "password": {
        "type": DataType.STRING,
        "rules": {
          "requiredx": true
        }
      },
      "remember_me": DataType.BIT
    }
  },
  "response": {
    "contentType": ContentType.JSON,
    "data": {
      "code": DataType.STRING,
      "message": DataType.STRING
    }
  }
});
console.log(API);

describe("login", function() {
  var client = spec.createHttpClient(props.host);
  it("Wrong username", function(done) {
    client.request({
      "method": "POST",
      "path": "/api/companies/signin",
      "data": {
        "email": "not_exists@test.com",
        "password": "password"
      }
    }, function(data, res) {
      assert.equal(res.statusCode, 200);
      assert.equal(data.code, 500);
      done();
    });
  });
  it("Wrong password", function(done) {
    client.request({
      "path": "/api/companies/signin",
      "method": "POST",
      "data": {
        "email": "konishi-test3@test.com",
        "password": "PASSWORD"
      }
    }, function(data, res) {
      assert.equal(res.statusCode, 200);
      assert.equal(data.code, 500);
      done();
    });
  });
  it("Correct login", function(done) {
    client.request({
      "path": "/api/companies/signin",
      "method": "POST",
      "data": {
        "email": "konishi-test3@test.com",
        "password": "password"
      }
    }, function(data, res) {
      assert.equal(res.statusCode, 200);
      assert.equal(data.code, 200);
      done();
    });
  });
});
