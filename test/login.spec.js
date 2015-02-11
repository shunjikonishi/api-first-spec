"use strict";
var 
  assert = require("chai").assert,
  spec = require("../lib/api-first-spec");

var API = spec.define({
  "endpoint": "/api/companies/signin",
  "method": "POST",
  "request": {
    "contentType": spec.ContentType.URLENCODED,
    "params": {
      "email": "string",
      "password": "string",
      "remember_me": "bit"
    },
    "rules": {
      "email": {
        "required": true
      },
      "password": {
        "required": true
      }
    }
  },
  "response": {
    "contentType": spec.ContentType.JSON,
    "data": {
      "code": "int",
      "message": "string"
    },
    "rules": {
      "code": {
        "required": true
      },
      "message": {
        "required": true
      }
    }
  }
});

describe("login", function() {
  var host = spec.host("localhost:8888");

  it("Wrong username", function(done) {
    host.api(API).params({
      "email": "test@test.com",
      "password": "password"
    }).success(function(data, res) {
      assert.equal(data.code, 500);
      done();
    });
  });
  it("Wrong password", function(done) {
    host.api(API).params({
      "email": "konishi-test3@test.com",
      "password": "PASSWORD"
    }).success(function(data, res) {
      assert.equal(data.code, 500);
      done();
    });
  });
  it("Correct login", function(done) {
    host.api(API).params({
      "email": "konishi-test3@test.com",
      "password": "password"
    }).success(function(data, res) {
      assert.equal(data.code, 200);
      done();
    });
  });
});
