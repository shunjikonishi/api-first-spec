# APIリファレンス
## トップレベルAPI
このライブラリのトップレベルは`Spec`というオブジェクトです。

```
var spec = require("api-first-spec");
```

Specは以下のメソッドを持ちます。

### define(apiConfig): API
- Parameter: 
  - apiConfig - APIの内容を表すオブジェクト
- Return:
  - API

APIオブジェクトを定義するメソッドです。
apiConfigの詳細は後述します。

### host(hostName: string, ssl: boolean): HttpClient
- Parameter:
  - hostName: string - ホスト名。(e.g. `localhost:9000`)
  - ssl: boolean - httpsアクセスをするか否かのフラグ(デフォルト false)
- Return:
  - HttpClient

指定のホストに対して定義済みのAPIを用いてアクセスするためのHttpClientを生成します。

### skipTest(flag?: boolean)
- Parameter:
   - flag - 指定された場合、SkipTestフラグ(API定義自体をテストするかどうか)を設定する
- Return:
  - 引数flagが省略された場合はSkipTestフラグを返す
  - 引数flagが設定された場合はフラグ設定後にSpecを返す

SkipTestフラグ(API定義自体をテストするかどうか)を設定・取得するためのメソッド。
jQueryの各種メソッドと同様に値の設定時にはチェーン可能

### verbose(flag?: boolean)
- Parameter:
   - flag - 指定された場合、Verboseフラグ(HttpClientで詳細ログを出力するかどうか)を設定する
- Return:
  - 引数flagが省略された場合はVerboseフラグを返す
  - 引数flagが設定された場合はフラグ設定後にSpecを返す

Verboseフラグ(HttpClientで詳細ログを出力するかどうか)を設定・取得するためのメソッド。
jQueryの各種メソッドと同様に値の設定時にはチェーン可能

### DataType
使用可能なデータ型の値が定義されているenumオブジェクト
定義済みの値は以下

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

※ データ型はこのenum値を使わずともstringとして指定可能

### ContentType
使用可能なContentTypeの値が定義されているenumオブジェクト
定義済みの値は以下

- CSV: "text/csv"
- TEXT: "text/plain"
- JSON: "application/json"
- URLENCODED: "application/x-www-form-urlencoded"
- MULTIPART: "multipart/form-data"

※ ContentTypeはこのenum値を使わずともstringとして指定可能

### Method
使用可能なMethodの値が定義されているenumオブジェクト
定義済みの値は以下

- GET: "GET"
- POST: "POST"
- PUT: "PUT"
- DELETE: "DELETE"

※ Methodはこのenum値を使わずともstringとして指定可能

## APIConfig
Spec#defineメソッドの引数となるオブジェクトは以下のキーを持つ

### endpoint
string. 必須

APIのエンドポイント

URLの一部にパラメータを含む場合は`[]`を使用して定義する

例)
- /api/users
- /api/users/[userId]

### method
string. 必須

APIのHTTPメソッド。`GET`, `POST`, `PUT`, `DELETE`のいずれか

### name
string. 任意

APIに名称がある場合はその値

### description
string. 任意

APIの説明文

### request
object.必須

リクエスト定義、必要なキーは以下

### request.contentType
string. 任意(省略時は`application/x-www-form-urlencoded`)

HTTPリクエストのContentType

### request.headers
object: 任意

リクエストに付加するHTTPヘッダ名と値のハッシュ

### request.params
object: 任意

リクエストパラメータ。パラメータ名とデータ型のハッシュとして定義。
ネスト可。
パラメータが配列の場合は値を`[]`で括る

例)
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
object: 任意

リクエストパラメータのルールを定義。
定義方法は後述

### response
object.必須

レスポンス定義、必要なキーは以下

### response.contentType
string. 任意(省略時は`application/json`)

HTTPレスポンスのContentType

### response.data
object: 任意

レスポンスボディのデータ構造(JSON)
パラメータ名とデータ型のハッシュとして定義。
ネスト可。
パラメータが配列の場合は値を`[]`で括る。

例)
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
object: 任意

レスポンスボディのルールを定義。
定義方法は後述

## Rules
`rules`ではフィールド毎のValidationルールを定義することができます。

指定できるルールとルール毎のパラメータは以下の通りです。

- required: boolean. 必須の場合trueを指定
- min: number. 数値型で許容する最小値を指定
- max: number. 数値型で許容する最大値を指定
- minlength: number. 文字列型で許容する最短長を指定
- maxlength: number. 文字列型で許容する最大長を指定
- pattern: string(正規表現). 文字列型が許容するパターンの正規表現を指定
- email: boolean. 文字列型がemailアドレスにマッチする必要がある場合にtrueを指定
- url: boolean, 文字列がURLにマッチする必要がある場合にtrueを指定
- list: Array<string|number>. 許容する値を配列で指定

ルールのパラメータにはstaticな値の他に関数を指定することもでき、他の項目の値によってValidationを切り替えることができます。

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
      // dataはresponseボディのJSONです。
      // codeが200の場合はresultは必須
      return data.code === 200;
    }
  }
  "result.name": {
    required: true,
    maxlength: 40
  }
}
```

フィールド名の指定は末端の名前だけを指定することもできますが、`.`区切りで深い階層のフィールドを指定することもできます。

```
rules: {
  "org.name": {
    maxlength: 100
  },
  "user.name": {
    maxlength: id
  },
  // この指定は`org.name`と`user.name`の両方に適用されます。
  name: {
    required: true
  }
}
```

"user.*"のようにワイルドカードを使用することも可能です。

## HttpClient
HttpClientは定義したAPIを実行するためのクライアントです。
リクエスト実行時にパラメータやレスポンスが定義に沿っていない場合はエラーとなります。

同一のHttpClientインスタンスを使用している間はCookieは維持されます。

### api(api: API): HttpClient
- Parameter: 
  - api - APIオブジェクト
- Return:
  - this

実行するAPIを設定します。
返り値は自分自身なのでメソッドチェーンできます。

### params(params: any)
- Parameter: 
  - params - 入力パラメータおよびURLパラメータ
- Return:
  - this

GETやPOSTに付加するパラメータを設定します。
また、URLパラメータ(endpointが`/users/[userId]`のように定義されている場合の`userId`)もここで指定します。
返り値は自分自身なのでメソッドチェーンできます。

### headers(headers: any)
- Parameter: 
  - headers - リクエストに設定されるヘッダ
- Return:
  - this

GETやPOSTに付加するパラメータを設定します。
また、URLパラメータ(endpointが`/users/[userId]`のように定義されている場合の`userId`)もここで指定します。
返り値は自分自身なのでメソッドチェーンできます。

### success(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

- Parameter:
  - callback: 省略可。実行成功時に実行するコールバック関数
  - validateInput: 入力パラメータのValidationを実行するかどうかのフラグ。省略時はtrue
- Return:
  - Promise<any> - HTTPレスポンスのステータスコードが20xの場合、レスポンスボディを含むPromise。

設定済みのapiとparamsを使用して実際にHttpリクエストを発行するメソッドです。
HTTPレスポンスの返り値が20x以外の場合返り値のPromiseはRejectされます。(callbackも実行されません。)

callbackの第1引数のdataとPromiseの中身は同じものです。
レスポンスのハンドリングでレスポンスボディ以外のRequest/Response情報が必要な場合はcallbackを使用できますが、殆どの場合Promiseで十分です。

例 mochaでのテストの例
```
var spec = require("api-first-spec");
var someApi = require("./someApi"); // 定義済みのAPI
var host = spec.host("localhost:9000");

describe("someAPI", function() {
  it("should succeed", function() {
    // 以下の場合にこのテストは失敗します。
    // - レスポンスのステータスコードが20xでなかった場合
    // - 入力パラメータが定義と異なる場合
    // - レスポンスボディが定義と異なる場合
    return host.api(someApi).params({
      param1: "hoge",
      params2: "fuga"
    }).success();
  });
})

### badRequest(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

successと同じくHTTPリクエストを実行するメソッドですが、HTTTPレスポンスのステータスコードが`400`以外の場合はPromiseがRejectされます。

### unauthorized(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

successと同じくHTTPリクエストを実行するメソッドですが、HTTTPレスポンスのステータスコードが`401`以外の場合はPromiseがRejectされます。

### forbidden(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

successと同じくHTTPリクエストを実行するメソッドですが、HTTTPレスポンスのステータスコードが`403`以外の場合はPromiseがRejectされます。

### notFound(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

successと同じくHTTPリクエストを実行するメソッドですが、HTTTPレスポンスのステータスコードが`404`以外の場合はPromiseがRejectされます。

### clientError(callback?: (data?: any, res?: Request.Response, req?: Request.Request) => void, validateInput: boolean = true): Promise<any>

successと同じくHTTPリクエストを実行するメソッドですが、HTTTPレスポンスのステータスコードが`4xx`以外の場合はPromiseがRejectされます。

## Optional env vars
以下の環境変数に"true"を指定することでトップレベルの`verbose`と`skipTest`の初期値を`true`に変更することができます。

- API_FIRST_SPEC_VERBOSE
- API_FIRST_SPEC_SKIP_TEST
