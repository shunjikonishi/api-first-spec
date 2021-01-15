## 0.1.0(2015-02-17)
- Initial release

## 0.1.5(2015-02-20)
- Bugfix
- Support wildcard in rules

## 0.1.6(2015-02-23)
- Bugfix
  - Allow content-type with charset
- Support dynamic rules

## 0.1.7(2015-02-27)
- BugFix
  - Allow null and undefined in pattern rule
- Add SKIP_TEST option
- Add VERBOSE option
- Add requiredAllowEmptyString rule
- Support function in request params

## 0.1.8(2015-04-23)
- Bugfix
  - date and datetime type doesn't work, if its format isn't default.

## 0.2.1(2015-04-27)
- Add badRequestAll method
- Add verbose log

## 0.2.3(2015-05-27)
- Bugfix of embeded parameter in endpoint.
- Bugfix of cookie handling

## 0.2.5(2015-05-28)
- Add list rule
- Mod login handling
- Mod some error message

## 0.2.6(2015-06-02)
- Bugfix: When the field value is object, datatype check was not correct.

## 0.2.7(2015-06-04)
- Add DataType: any

## 0.2.8(2015-07-02)
- Mod debug log

## 0.2.9(2015-07-18)
- Add httpClient#headers method
- Bugfix of 204 NoContent handling

## 0.2.12(2017-05-16)
- Add default headers/params support
- Some bugfix

## 0.2.13(2017-05-16)
- Support headers definition in request.

## 0.2.14(2018-01-21)
- Promisify request methodd
- Mod error messages
- Bugfix of content-length of non-ascii body
- Add forbidden method
- Add embedded rules in type.

## 1.0.0(2018-02-05)
- Bugfix of cookie handling
- Support mutlipart/form-data test

## 1.0.2(2018-03-27)
- Bugfix of array handling in mutlipart/form-data
- Add text/csv to ContentType

## 2.0.1(2018-08-02)
- Completely rewrite with TypeScript
- Reduce test output 
- Remove unused features
- Add input parameter validation
- Add testCoverage method

## 2.0.6(2021-01-16)
- Support rails style arrayFormat
  - See. https://github.com/ljharb/qs#stringifying