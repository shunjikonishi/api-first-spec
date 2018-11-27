import { API, ContentType, Method }  from "./api";
import { DataType } from "./datatype";
import { HttpClient, IDefaultParameters } from "./httpClient";

declare function describe(name: string, callback: () => void): void;
declare function it(name: string, callback: () => void): void;

class ApiFirstSpec {
  private _skipTest: boolean = (process.env.API_FIRST_SPEC_SKIP_TEST || "false") !== "false";
  private _verbose: boolean = (process.env.API_FIRST_SPEC_VERBOSE || "false") !== "false";

  public define(config: ApiConfig) {
    const api = new API(config);
    api.verbose(this._verbose);
    if (!this._skipTest) {
      if ("describe" in global && "it" in global) {
        describe("Verify API definition", () => {
          it(api.name, () => {
            api.test();
          });
        });
      } else {
        api.test();
      }
    }
    return api;
  }

  public host(hostName: string, ssl: boolean, defaults: IDefaultParameters): HttpClient;
  public host(config: HttpClientConfig, defaults: IDefaultParameters): HttpClient;
  public host(arg1: HttpClientConfig | string, arg2: any, arg3?: IDefaultParameters) {
    if (typeof arg1 === "string") {
      const config: HttpClientConfig = {
        host: arg1,
        ssl: arg2,
        validateRequest: true
      };
      return new HttpClient(config, arg3);
    } else {
      return new HttpClient(arg1, arg2);
    }
  }

  public skipTest(v?: boolean) {
    if (typeof v === "boolean") {
      this._skipTest = v;
      return this;
    } else {
      return this._skipTest;
    }
  }

  public verbose(v?: boolean) {
    if (typeof v === "boolean") {
      this._verbose = v;
      return this;
    } else {
      return this._verbose;
    }
  }

  public get DataType() {
    return DataType;
  }

  public get ContentType() {
    return ContentType;
  }

  public get Method() {
    return Method;
  }
}

export = new ApiFirstSpec();
