import axios, { AxiosResponse } from "axios";
import { RouteParams } from "./RouteParams";

export const apiClient = axios.create({
  headers: {
    'X-Timezone-Offset': new Date().getTimezoneOffset(),
  },
  paramsSerializer: RouteParams.generateRouteParams,
});

apiClient.interceptors.response.use((response: AxiosResponse<any>) : Promise<any> => {

  if (!response.data)
    return Promise.reject(response.data)

  return Promise.resolve(response.data);
},
  (error: any) => Promise.reject(error),
)

const { get, post, put, delete: destroy } = apiClient;
export { get, post, put, destroy };
