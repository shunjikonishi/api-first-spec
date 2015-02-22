"use strict";
var 
  host = process.env.TEST_HOST || "api-first-spec-test.herokuapp.com";

console.log("host: " + host);
module.exports = {
  host: host
};