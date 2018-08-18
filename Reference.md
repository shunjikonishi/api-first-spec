# Reference
Sorry. Now only [Japanese version](Reference_ja.md) is available.

## Top level API
The top level object of this library is `Spec` object.

```
var spec = require("api-first-spec");
```

Spec has following methods.

### define(apiConfig): API
- Parameter: 
  - apiConfig - Object which describes API
- Return:
  - API

Define API object
The detail of apiConfig is later.

### host(hostName: string, ssl: boolean): HttpClient
- Parameter:
  - hostName: string - host name(e.g. `localhost:9000`)
  - ssl: boolean - The flag which specifies using https or not. (Default false)
- Return:
  - HttpClient

Generate HttpClient object which access to specified host.

### skipTest(flag?: boolean)
- Parameter:
   - flag - The flag which specifies skip test for API itself or not.
- Return:
  - If flag parameter absent in params, it returns skipTest property value.
  - If flag parameter present in params, it returns Spec itself.

The method for get/set skipTest flag.
Like JQuery, the return value of this method is different by get/set.

### verbose(flag?: boolean)
- Parameter:
   - flag - The flag which specifies verbose for API itself or not.
- Return:
  - If flag parameter absent in params, it returns verbose property value.
  - If flag parameter present in params, it returns Spec itself.

The method for get/set verbose flag.(Show detail logs on Http execution or not.)
Like JQuery, the return value of this method is different by get/set.

### DataType
An string enum which defines available DataTypes.
Defined values are below.

- ANY: "any"
- STRING: "string"
- INT: "int"
- LONG: "long"
- DOUBLE: "double"
- NUMBER: "number"
- BOOLEAN: "boolean"
- DATE: "date"
- DATETIME: "datetime"
- BIT: "bit"

※ You can use string in API definition too.

### ContentType
An string enum which defines available ContentType
Defined values are below.

- CSV: "text/csv"
- TEXT: "text/plain"
- JSON: "application/json"
- URLENCODED: "application/x-www-form-urlencoded"
- MULTIPART: "multipart/form-data"

※ You can use string in API definition too.

### Method
An string enum which defines available HTTP methods.
Defined values are below.

- GET: "GET"
- POST: "POST"
- PUT: "PUT"
- DELETE: "DELETE"

※ You can use string in API definition too.

## APIConfig
You can use following keys in object which passed to Spec#define method.

### endpoint
string. required

The endpoint for API.

If that contains URL parameters, you can define it with `[]`.

Example.
- /api/users
- /api/users/[userId]

### method
string. required

The method of HTTP.

One of `GET`, `POST`, `PUT`, or `DELETE`.

### name
string. optional

The name for this API.

### description
string. optional

The description for this API.

### request
object. required

The request definition. The keys of this object are below.

### request.contentType
string. optional(If omitted, it will be `application/x-www-form-urlencoded`)

The content-type of HTTP request.

### request.headers
object. optional

HTTP headers which added to http request.

### request.params
object. optional

The definition for request parameters.
Key and DataType pair of parameters.

You can use nested keys.
If parameter value is array, use `[]` with DataType.


Example.
```
params: {
  name: "string",
  imageUrl: "string",
  age: "int"
  hobby: ["string"],
  school: {
    name: "string",
    grade: "int"
  }
}
```

### request.rules
object. optional

The validation rules for input parameters.

How to define rules are later.

### response
object. required

The response definition. The keys of this object are below.

### response.contentType
string. optional(If omitted, it will be `application/json`)

The content-type for HTTP response.

### response.data
object. optional

The data structure of response body.(JSON).
Key and DataType pair of response body.

You can use nested keys.
If parameter value is array, use `[]` with DataType.

Example.
```
data: {
  name: "string",
  imageUrl: "string",
  age: "int"
  hobby: ["string"],
  school: {
    name: "string",
    grade: "int"
  }
}
```

### response.rules
object. optional

The validation rules for response body.

How to define rules are later.

## Rules
`rules` describes validation rules for each fields.

You can use following key and values.

- required: boolean. If the field is required, specify `true`.
- min: number. The minimum number for number datatype.
- max: number. The maximum number for number datatype.
- minlength: number. The minimum length for string datatype.
- maxlength: number. The maximum length for string datatype.
- pattern: string(Regex). Allowed regex pattern for string datatype.
- email: boolean. If the field should be email address, specify `true`.
- url: boolean, If the field should be url, specify `true`.
- list: Array<string|number>. The list for allowed values.

You can use function in rule.  
It means you can switch validation rule by other field status.

```
rules: {
  id: {
    required: true
  },
  code: {
    required: true,
    list: [200, 404]
  }
  result: {
    required: function(data) {
      // The parameter data is response body
      // Below means it is required only when data.code === 200.
      return data.code === 200;
    }
  }
  "result.name": {
    required: true,
    maxlength: 40
  }
}
```

For field name you can use `.` separated name.

```
rules: {
  "org.name": {
    maxlength: 100
  },
  "user.name": {
    maxlength: id
  },
  // This rule is appliced to both `org.name` and `user.name`.
  name: {
    required: true
  }
}
```

Also you can use wildcard for field name. (e.g. `user.*`).

## HttpClient
HttpClient is the object to execute defined API.
If passed request parameters or response body is not match with API definition, it causes Error.

A HttpClient instance keeps cookie.

### api(api: API): HttpClient
- Parameter: 
  - api - API
- Return:
  - this

Specify API to execute.
It returns `this`, so you can make method chain.

### params(params: any)
- Parameter: 
  - params - Input parameters and URL parameters.
- Return:
  - this

Specify input parameters for GET/POST/PUT request.
Also, URL parameters in endpoint should be specified here. (e.g. `userId` for the endpoint `/users/[userId]`)
It returns `this`, so you can make method chain.

### headers(headers: any)
- Parameter: 
  - headers - HTTP headers for request
- Return:
  - this

HTTP headers for request.
It returns `this`, so you can make method chain.


### success(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

- Parameter:
  - callback: optional. The callback method which is executed on API execution success.
  - validateInput: The flag to validate input parameters or not. If omitted, default value is `true`.
- Return:
  - Promise<any> - If the status code of HTTP response is 20x, it returns Promise of response body.

Execute API call with specified api and params.
If the status code of HTTP response is not 20x, returned Promise will be rejected. In this case, callback is not executed.

The first parameter of callback is same as Promise content.
If you need HTTP request/response object to handle response, you can use callback.
However most of cases, using Promise is enough and better.

Example for mocha test.
```
var spec = require("api-first-spec");
var someApi = require("./someApi"); // Defined API
var host = spec.host("localhost:9000");

describe("someAPI", function() {
  it("should succeed", function() {
    // This test will fail with follwing cases.
    // - The status code of response is not 20x.
    // - The input parameters are different from API definition.
    // - The response body is different from API definition.
    return host.api(someApi).params({
      param1: "hoge",
      params2: "fuga"
    }).success();
  });
})

### badRequest(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

As same as `success`, it executes HTTP request.
But the result Promise will be rejected when the status code of response is not `400`.

### unauthorized(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

As same as `success`, it executes HTTP request.
But the result Promise will be rejected when the status code of response is not `401`.

### forbidden(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

As same as `success`, it executes HTTP request.
But the result Promise will be rejected when the status code of response is not `403`.

### notFound(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

As same as `success`, it executes HTTP request.
But the result Promise will be rejected when the status code of response is not `404`.

### clientError(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

As same as `success`, it executes HTTP request.
But the result Promise will be rejected when the status code of response is not `4xx`.

## Optional env vars
You can turn the default value for `verbose` and `skipTest` to `true` by specifying following env variables with value `true`.

- API_FIRST_SPEC_VERBOSE
- API_FIRST_SPEC_SKIP_TEST
