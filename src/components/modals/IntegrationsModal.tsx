import React, { useEffect, useState } from 'react';
import { X, Calendar, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';

interface ConfigStatus {
  google: { configured: boolean; clientId: string };
  microsoft: { configured: boolean; clientId: string };
}

export function IntegrationsModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateUser } = useStore();
  const [config, setConfig] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetch('/api/auth/integrations-status')
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load integrations status:', err));
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_CODE_RECEIVED') {
        if (!currentUser) return;
        
        // Exchanging the code for a token on our backend...
        fetch(`/api/auth/${event.data.provider}/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: event.data.code })
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          if (event.data.provider === 'google') {
            updateUser(currentUser.id, { 
              googleIntegration: { connected: true, tokens: data.tokens } 
            });
          } else if (event.data.provider === 'microsoft') {
            updateUser(currentUser.id, { 
              msIntegration: { connected: true, tokens: data.tokens } 
            });
          }
        })
        .catch(err => {
          console.error('Failed to exchange code', err);
          alert('Failed to complete integration.');
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, updateUser]);

  if (!currentUser) return null;

  const handleConnectGoogle = async () => {
    if (!config?.google.configured) {
      alert("Missing Google configuration on server.");
      return;
    }
    try {
      const response = await fetch(`/api/auth/google/url`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err) {
      console.error(err);
      alert('Could not start Google connection.');
    }
  };

  const handleConnectMicrosoft = async () => {
    if (!config?.microsoft.configured) {
      alert("Missing Microsoft configuration on server.");
      return;
    }
    try {
      const response = await fetch(`/api/auth/microsoft/url`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err) {
      console.error(err);
      alert('Could not start Microsoft connection.');
    }
  };

  const handleDisconnectGoogle = () => {
    updateUser(currentUser.id, { googleIntegration: undefined });
  };

  const handleDisconnectMicrosoft = () => {
    updateUser(currentUser.id, { msIntegration: undefined });
  };

  const isAdmin = currentUser.role === 'administrator';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Settings & Integrations</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <p className="text-sm text-gray-600 mb-6 font-medium">Connect your personal accounts to sync emails, events, and generate meeting links.</p>
            <div className="space-y-4">
              
              {/* Google Integration */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Google Workspace</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Sync Gmail & Google Calendar</p>
                  </div>
                  {currentUser.googleIntegration?.connected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected
                      </div>
                      <button onClick={handleDisconnectGoogle} className="text-xs font-semibold text-red-600 hover:text-red-700">Disconnect</button>
                    </div>
                  ) : config?.google.configured ? (
                    <button 
                      onClick={handleConnectGoogle}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      Connect
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Not configured
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Admin view:</span> {config?.google.configured ? `Configured with App ID: ${config.google.clientId.substring(0, 15)}...` : 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env'}
                  </div>
                )}
              </div>

              {/* Microsoft Integration */}
              <div className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Microsoft Office 365</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Sync Outlook, Teams & Calendar</p>
                  </div>
                  {currentUser.msIntegration?.connected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected
                      </div>
                      <button onClick={handleDisconnectMicrosoft} className="text-xs font-semibold text-red-600 hover:text-red-700">Disconnect</button>
                    </div>
                  ) : config?.microsoft.configured ? (
                    <button 
                      onClick={handleConnectMicrosoft}
                      className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      Connect
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Not configured
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Admin view:</span> {config?.microsoft.configured ? `Configured with Client ID: ${config.microsoft.clientId.substring(0, 8)}...` : 'Missing MS_CLIENT_ID or MS_CLIENT_SECRET in .env'}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
