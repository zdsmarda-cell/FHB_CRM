import React, { useEffect, useState } from 'react';
import { X, Calendar, Mail, CheckCircle } from 'lucide-react';
import { useStore } from '../../store';

export function IntegrationsModal({ onClose }: { onClose: () => void }) {
  const { currentUser, updateUser } = useStore();
  const [googleClientId, setGoogleClientId] = useState(currentUser?.googleIntegration?.clientId || '');
  const [googleClientSecret, setGoogleClientSecret] = useState(currentUser?.googleIntegration?.clientSecret || '');
  const [showGoogleForm, setShowGoogleForm] = useState(!currentUser?.googleIntegration?.connected);

  const [msClientId, setMsClientId] = useState(currentUser?.msIntegration?.clientId || '');
  const [msClientSecret, setMsClientSecret] = useState(currentUser?.msIntegration?.clientSecret || '');
  const [showMsForm, setShowMsForm] = useState(!currentUser?.msIntegration?.connected);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow window origin
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (!currentUser) return;
        
        if (event.data.provider === 'google') {
          updateUser(currentUser.id, { 
            googleIntegration: { ...currentUser.googleIntegration, clientId: googleClientId, clientSecret: googleClientSecret, connected: true } 
          });
          setShowGoogleForm(false);
        } else if (event.data.provider === 'microsoft') {
          updateUser(currentUser.id, { 
            msIntegration: { ...currentUser.msIntegration, clientId: msClientId, clientSecret: msClientSecret, connected: true } 
          });
          setShowMsForm(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, updateUser, googleClientId, googleClientSecret, msClientId, msClientSecret]);

  if (!currentUser) return null;

  const handleConnectGoogle = async () => {
    if (!googleClientId || !googleClientSecret) {
      alert("Please enter Client ID and Secret");
      return;
    }
    try {
      const response = await fetch(`/api/auth/google/url?clientId=${encodeURIComponent(googleClientId)}`);
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err) {
      console.error(err);
      alert('Could not start Google connection.');
    }
  };

  const handleConnectMicrosoft = async () => {
    if (!msClientId || !msClientSecret) {
      alert("Please enter Client ID and Secret");
      return;
    }
    try {
      const response = await fetch(`/api/auth/microsoft/url?clientId=${encodeURIComponent(msClientId)}`);
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
    setGoogleClientId('');
    setGoogleClientSecret('');
    setShowGoogleForm(true);
  };

  const handleDisconnectMicrosoft = () => {
    updateUser(currentUser.id, { msIntegration: undefined });
    setMsClientId('');
    setMsClientSecret('');
    setShowMsForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Personal Integrations</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <p className="text-sm text-gray-600 mb-6">Each user must connect their own account using their personal App credentials. These are securely saved in the database only for your profile.</p>
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
                  {currentUser.googleIntegration?.connected && !showGoogleForm ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected
                      </div>
                      <button onClick={handleDisconnectGoogle} className="text-xs font-semibold text-red-600 hover:text-red-700">Disconnect</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowGoogleForm(!showGoogleForm)}
                      className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      {showGoogleForm ? "Cancel" : "Setup"}
                    </button>
                  )}
                </div>
                
                {showGoogleForm && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                      <input 
                        type="text" 
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                      <input 
                        type="password" 
                        value={googleClientSecret}
                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                       <button 
                        onClick={handleConnectGoogle}
                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Save & Connect
                      </button>
                    </div>
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
                  {currentUser.msIntegration?.connected && !showMsForm ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected
                      </div>
                      <button onClick={handleDisconnectMicrosoft} className="text-xs font-semibold text-red-600 hover:text-red-700">Disconnect</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowMsForm(!showMsForm)}
                      className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      {showMsForm ? "Cancel" : "Setup"}
                    </button>
                  )}
                </div>
                
                {showMsForm && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client ID / App ID</label>
                      <input 
                        type="text" 
                        value={msClientId}
                        onChange={(e) => setMsClientId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                      <input 
                        type="password" 
                        value={msClientSecret}
                        onChange={(e) => setMsClientSecret(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                       <button 
                        onClick={handleConnectMicrosoft}
                        className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Save & Connect
                      </button>
                    </div>
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
