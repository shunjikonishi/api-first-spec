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
  }

  public host(hostName: string, ssl: boolean, defaults: IDefaultParameters) {
    return new HttpClient(hostName, ssl, defaults);
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

export default new ApiFirstSpec();
