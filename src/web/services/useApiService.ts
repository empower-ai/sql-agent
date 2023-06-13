import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';

export interface GetModelsRequestProps {
  key: string
}

const useApiService = () => {
  const fetchService = useFetch();

  const getModels = useCallback(
    async (params: GetModelsRequestProps, signal?: AbortSignal) => {
      return await fetchService.post<GetModelsRequestProps>('/api/models', {
        body: { key: params.key },
        headers: {
          'Content-Type': 'application/json'
        },
        signal
      });
    },
    [fetchService]
  );

  return {
    getModels
  };
};

export default useApiService;
