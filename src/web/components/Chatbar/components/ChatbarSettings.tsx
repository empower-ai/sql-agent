import { IconFileExport, IconMail, IconSchema, IconSettings } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { ClearConversations } from './ClearConversations';
import { SchemasDialog } from '@/components/Schemas/SchemasDialog';

export const ChatbarSettings = () => {
  const [showSettingDialog, setShowSettingDialog] = useState<boolean>(false);

  const {
    state: {
      apiKey,
      serverSideApiKeyIsSet,
      conversations,
      showSchemasDialog
    },
    dispatch
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
    handleApiKeyChange
  } = useContext(ChatbarContext);

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {conversations.length > 0
        ? (
          <ClearConversations onClearConversations={handleClearConversations} />
          )
        : null}

      <Import onImport={handleImportConversations} />

      <SidebarButton
        text={'Export data'}
        icon={<IconFileExport size={18} />}
        onClick={() => { handleExportData(); }}
      />

      <SidebarButton
        text={'Show schemas'}
        icon={<IconSchema size={18} />}
        onClick={() => {
          dispatch({
            field: 'showSchemasDialog',
            value: true
          })
        }}
      />

      <SidebarButton
        text={'Settings'}
        icon={<IconSettings size={18} />}
        onClick={() => { setShowSettingDialog(true); }}
      />

      {!serverSideApiKeyIsSet
        ? (
          <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
          )
        : null}

      {/* {!serverSidePluginKeysSet ? <PluginKeys /> : null} */}

      <SettingDialog
        open={showSettingDialog}
        onClose={() => {
          setShowSettingDialog(false);
        }}
      />

      <SchemasDialog
        open={showSchemasDialog}
        onClose={() => {
          dispatch({
            field: 'showSchemasDialog',
            value: false
          });
        }}
      />

      <SidebarButton
        text={'Contact Us'}
        icon={<IconMail size={18} />}
        onClick={() => {
          window.location.href = 'mailto:yulong@dsensei.dev'
        }}
      />
    </div>
  );
};
