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

## Usage
### Describe API spec.
This API spec is one of Mocha test.
So you can validate it with Mocha.

``` javascript
var spec = require("api-first-spec");

var API = spec.define({ ... });
```

#### Config reference of define method.
##### endpoint
Required.

Path of API.  
If you want to use parameter in path, you can use parameter name with [].

``` javascript
"endpoint": "/item/[itemId]/detail"
```

## Make some test.

## Sample
- [login](test/login.spec.js)

## ToDo
- Support automatically badRequest test.
- Support neted data.
- Support upload(multipart/form-data) and download(e.g. application/pdf).
- Support authenticated API.
- Setup test server on Heroku.
