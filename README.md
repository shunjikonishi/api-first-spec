# api-first-spec
Sync your API implementation and documents always!

## Motivation
I'm a backend engineer.  
I have to write API document for frontend engineers.
It is very bored. And I and most of my co-workers often forget to update document after API improvement.

This is a solution for that situation.

## Goal
- Describe API specification as simple as possible.
  - Any engineers who doesn't know about api-first-spec can read it.
- Test API specification itself.
- Make API test as easy as possible.
- **Force to sync API implementation and document always.**

## How it works
- Define API spec as a JavaScript object.
- You can make e2e test with that defined API object.
- When you make some update on that API and not update API spec, test will fail.
  - Unknown field exists in API response
  - Unknown parameter exists in API parameters
- You have to update spec object to pass test. -> **Sync API implementation and document always!**

## Install
``` bash
npm install api-first-spec
```
## How to define spec
Example is like this.

``` javascript
var spec = require("../lib/api-first-spec");

var API = spec.define({
  name: "Sign in",
  description: `
    Sign in to the system by email and password.
  `,
  endpoint: "/auth/signin",
  method: "POST",
  request: {
    contentType: spec.ContentType.URLENCODED,
    params: {
      email: "string",
      password: "string",
      remember_me: "boolean"
    },
    rules: {
      email: {
        required: true,
        email: true
      },
      password: {
        required: true,
        minlength: 8,
        maxlength: 40
      }
    }
  },
  response: {
    contentType: spec.ContentType.JSON,
    data: {
      code: "int",
      message: "string",
      result: {
        id: "int",
        name: "string",
        imageUrl: "string",
        lastLogin: "datetime"
      }
    },
    rules: {
      code: {
        required: true
      },
      result: {
        required: function(data) {
          return data.code === 200;
        }
      },
      "result.id": {
        required: true
      },
      "result.name": {
        required: true
      },
    }
  }
});

module.exports = API;
```

Probably most of engineers can read it without special knowlegde.
Detailed reference is [here](Reference.md#Define Spec)

## How to make test
You can make test with [mocha](https://mochajs.org/)

Example is like this.

``` javascript
var assert = require("chai").assert;
var SigninAPI = require("./Signin.spec.js");

describe("signin", function() {
  var host = spec.host("localhost:9000");

  it("succeed with corrct email and password", function(done) {
    return host.api(API).params({
      "email": "test@test.com",
      "password": "password"
    }).success().then(data => {
      assert.equal(data.code, 200);
      assert.equal(data.result.id, 1);
      assert.equal(data.result.name, "test");
    });
  });

  it("with wrong email should be badRequest", () => {
    return host.api(SigninAPI).params({
      email: "unknown@test.com",
      password: "password"
    }).badRequest();
  });

  it("with wrong password should be badRequest", function(done) {
    return host.api(API).params({
      "email": "test@test.com",
      "password": "PASSWORD"
    }).badRequest();
  });
});
```

`spec#host` method returns a HttpClient.
It can make several API calls with defined API.
It handles cookie properly.
Detailed reference is [here](Reference.md#Make Test)
