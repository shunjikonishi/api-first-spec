interface ApiConfig {
  name?: string;
  description?: string;
  endpoint: string;
  method: string;
  request: RequestConfig;
  response: ResponseConfig;
}

interface RequestConfig {
  contentType?: string;
  headers?: any;
  params?: any;
  rules?: any;
}

interface ResponseConfig {
  contentType?: string;
  data: any;
  rules: any;
}

interface HttpClientConfig {
  host: string
  ssl: boolean
  validateRequest: boolean
}