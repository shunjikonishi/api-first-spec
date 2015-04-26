# api-first-spec
A tool for API First development.  
It allows you to describe API specification as a test.

## Goal
- Describe API specification as simple as possible.
- Testing API specification itself.
- Making API test as easy as possible.
- Extensible

## Requirement
- npm
- mocha

## Install
``` bash
npm install api-first-spec
```

## Run test
``` bash
mocha your_test.spec.js
```

If you want to see communication detail, run with environment variables API_FIRST_SPEC_VERBOSE

``` bash
env API_FIRST_SPEC_VERBOSE=true mocha your_test.spec.js
```

## Sample
- [login](test/login.spec.js)

## Usage
### Describe API spec.
This API spec is one of Mocha test.  
So you can validate it with Mocha.

``` javascript
var spec = require("api-first-spec");

var API = spec.define({ ... });

//If you want, you can export API as a module
//module.exports = API;
```

#### Config reference of define method.
##### name
Option.  

API name.

##### description
Option.  

Any description.

##### endpoint
Required.  

Path of API.  

If you want to use parameter in path, you can use parameter name with [].

``` javascript
"endpoint": "/item/[itemId]/detail"
```

##### method
Required.

HTTP method.

Allowed values are ["GET", "POST", "PUT", "DELETE"];

##### login
Option.

If this API requires authentication, set authentication API.

##### request
Option.

Describe request specification.

##### request.contentType
Option.

Content-Type header of request.  
If omitted, its defalut value is "application/x-www-form-urlencoded".

Currently, supported values are follows.

- application/x-www-form-urlencoded
- application/json

multipart/form-data isn't supported yet.

##### request.params
Option.

Describe request parameters.

See parameters section.

##### request.rules
Option.

Describe validation rules of request parameters.

See rules section.

##### response
Required.

Describe response specification.

##### response.contentType
Option.

Content-Type header of response.  
If omitted, its default value is "application/json".

##### response.data
Option.

Describe response data structure.

See parameters section.

##### response.rules
Option.

Describe validation rules of response data.

See rules section.

##### response.strict
Option.

If true, the response json can't have the key doesn't defined in response.data.

##### isSuccess, isBadRequest, isNotFound, isUnauthorized, isClientError
Option.

The methods corresponding to test methods.  
These methods judge the test succeed or not.

Default implementations are [here](https://github.com/shunjikonishi/api-first-spec/blob/3460c4a7c0a7a0539c4d83684991984d102023a4/lib/api-first-spec.js#L254-268).

You can override these methods.

### Parameters
Define parameters as is.

- Define parameter name and its data type.
- If parameter is an object, you can use object literal({}).
- If parameter is an array, you can use array literal([]).

``` javascript
  data: {
    code: "int",
    message: "string",
    list: [{
      id: "int",
      name: "string",
      created_at: "date",
      company: {
        id: "int",
        name: "string"
      }
    }],
    errors: ["string"]
  }
```

Supported data types are follows.

- string
- int
- number
- boolean(true or false)
- date
- datetime
- bit(0 or 1)

If the data type is date or datetime, you can specify its format in rules section.

### Rules
You can define validation rules to each parameters.

``` javascript
  rules: {
    code: {
      "required": true,
      "min": 200,
      "max": 500
    ),
    "id": {
      required: true
    },
    "list.name": {
      required: true
    },
    "list.company.name": {
      required: false
    },
    "company": {
      required: false
    },
    "list.created_at": {
      required: true,
      format: "YYYY-MM-DD"
    },
    "errors": {
      required: function(data) {
        return data.code !== 200;
      }
    }
  }
```

If the correspond parameter is in deep object, you can specify its name by dot separated name.  
Or single name applied to each parameters.  

In above example, "id" rule is applied to "list.id" and "list.company.id".

You can alse use wildcard. (e.g. '*', 'seminars.*')

Supported rules are follows.

- required
- min
- max
- minlength
- maxlength
- pattern
- email
- url
- format

If you want to use dynamic rule.(e.g. required if the code field value != 200)

```
    "errors": {
      required: function(data, reqData) {
        return data.code !== 200;
      }
    }
```

It takes two arguments. response data and request data.

## Make tests
You can make tests for [mocha](http://mochajs.org/) with this API spec.

### Basic usage
``` javascript
var 
  spec = require("api-first-spec"),
  assert = require("chai").assert;

var API = spec.define(...);

describe("Some test", function() {
  var host;
  before(function() {
    host = spec.host("localhost:9000");
  });

  it("success", function(done) {
    host.api(API).params({
      email: "test@test.com",
      password: "password"
    }).success(function(data, res) {
      assert.equal(200, data.code);
      done();
    });
  });
});
```

The points of above are follows.

- Specify target host by spec#host method.
- Specify test API by host#api method. It returns new host instance.
- Specify request parameters by host#params method. It returns new host instance.
- Call host#success or other test method to execute request.
  - Its argument is a callback function.
  - Callback function takes 2 arguments. data(JSON) and response.
  - Or you can directly set done as a callback function.

When you use success method, the validations that defined in response.rules are applied to all response data.

### Test with invalid parameters.
``` javascript
describe("Invalid parameters.", function() {
  var host;
  before(function() {
    host = spec.host("localhost:9000");
  });

  it("sholud has email", function(done) {
    host.api(API).params({
      email: null,
      password: "password"
    }).badRequest(done);
  });
});
```

By default, following function is used to judge badRequest.

``` javascript
function isBadRequest(data, res) {
  return res.statusCode === 400;
}
```

You can override this function in API spec.

### Test with login
You can export API as a module. And reuse it in other test.

``` javascript
var 
  spec = require("api-first-spec"),
  assert = require("chai").assert,
  LoginAPI = require("./login.spec");

var API = spec.define({
  ...
  login: LoginAPI
});

describe("Auth test", function() {
  var host;
  before(function() {
    host = spec.host("localhost:9000");
  });

  it("can't call without login", function(done) {
    host.api(API).params({
      p1: "aaa",
      p2: "bbb"
    }).unauthorized(done);
  });
});

describe("Some test", function() {
  var host;
  before(function(done) {
    host = spec.host("localhost:9000").api(API).login({
      email: "test@test.com",
      password: "password"
    }).success(done);
    //It is same as spec.host(...).api(LoginAPI).params(...).success(done)
  });

  it("success", function(done) {
    host.api(API).params({
      p1: "aaa",
      p2: "bbb"
    }).success(done);
  });
});

```

The important things are

- You must call login method in before or beforeEach method.
- You must pass the done function to success callback.

Otherwise each tests might execute without login.

## ToDo
- Support dynamic rules.(e.g. required with some condition.)
- Support basic authentication
- Support http headers validation
- Support automatically badRequest test.
- Support upload(multipart/form-data) and download(e.g. application/pdf).
- Setup test server on Heroku.
