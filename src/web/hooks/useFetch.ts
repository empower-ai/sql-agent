export interface RequestModel {
  params?: object
  headers?: object
  signal?: AbortSignal
}

export type RequestWithBodyModel = RequestModel & {
  body?: object | FormData
};

export const useFetch = () => {
  const handleFetch = async (
    url: string,
    request: any,
    signal?: AbortSignal
  ) => {
    const requestUrl = request?.params ? `${url}${request.params}` : url;

    const requestBody = request?.body
      ? request.body instanceof FormData
        ? { ...request, body: request.body }
        : { ...request, body: JSON.stringify(request.body) }
      : request;

    const headers = {
      ...(request?.headers
        ? request.headers
        : request?.body && request.body instanceof FormData
          ? {}
          : { 'Content-type': 'application/json' })
    };

    return await fetch(requestUrl, { ...requestBody, headers, signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(JSON.stringify(response));

        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');

        const result =
          contentType &&
          (contentType?.includes('application/json') ||
            contentType?.includes('text/plain'))
            ? response.json()
            : contentDisposition?.includes('attachment')
              ? response.blob()
              : response;

        return await result;
      })
      .catch(async (err) => {
        const contentType = err.headers.get('content-type');

        const errResult =
          contentType && contentType?.indexOf('application/problem+json') !== -1
            ? await err.json()
            : err;

        throw errResult;
      });
  };

  return {
    get: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return await handleFetch(url, { ...request, method: 'get' });
    },
    post: async <T>(
      url: string,
      request?: RequestWithBodyModel
    ): Promise<T> => {
      return await handleFetch(url, { ...request, method: 'post' });
    },
    put: async <T>(url: string, request?: RequestWithBodyModel): Promise<T> => {
      return await handleFetch(url, { ...request, method: 'put' });
    },
    patch: async <T>(
      url: string,
      request?: RequestWithBodyModel
    ): Promise<T> => {
      return await handleFetch(url, { ...request, method: 'patch' });
    },
    delete: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return await handleFetch(url, { ...request, method: 'delete' });
    }
  };
};
