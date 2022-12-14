import axios, { AxiosError } from "axios";

export async function batchHttpGet<T extends Record<string, string>>(
  urls: T
): Promise<{ [x in keyof T]: any }> {
  let requests = {};
  let results = await Promise.all(
    Object.keys(urls).map((name) => {
      return new Promise(async (res, rej) => {
        let url = urls[name];
        try {
          let response = await axios.get(url);
          res(response.data);
        } catch (err: any) {
          if (err instanceof AxiosError) {
            rej({
              url,
              status: err.status,
              message: err.message,
              response: err.response,
            });
          } else {
            console.log("Error at url:", url);
            console.log(err);
          }
        }
      });
    })
  );
  Object.keys(urls).forEach((url, index) => (requests[url] = results[index]));
  return requests as any;
}

export async function httpGet(url: string): Promise<any> {
  console.debug(`Fetching URL ${url}`);
  let response = await axios.get(url);
  return response.data;
}
