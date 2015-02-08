"use strict";
var 
  assert = require("chai").assert,
  utils = require("../lib/api-first-spec"),
  props = require("./env/properties.json");

describe("login", function() {
  var client = utils.createHttpClient(props.host);
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
