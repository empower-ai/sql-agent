import { type Plugin, PluginID } from '@/types/plugin';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return 'api/dsensei';
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  return 'api/dsensei';
};
