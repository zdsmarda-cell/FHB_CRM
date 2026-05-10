import { Globe, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { IntegrationsModal } from '../modals/IntegrationsModal';

export function Header() {
  const { t, i18n } = useTranslation();
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const [showIntegrations, setShowIntegrations] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'cs' ? 'en' : 'cs');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-6">
        <h1 
          className="text-xl font-bold text-indigo-700 tracking-tight cursor-pointer"
          onClick={() => {
            useStore.getState().refreshState();
            navigate('/');
          }}
        >
          {t('appName')}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={() => setShowIntegrations(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        {/* Language Switcher */}
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          <Globe className="w-4 h-4" />
          {i18n.language.toUpperCase()}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800 leading-tight block">
                {currentUser?.name}
              </span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block">
                {currentUser ? t(`roles.${currentUser.role}`) : ''}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            title={t('auth.logout')}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showIntegrations && <IntegrationsModal onClose={() => setShowIntegrations(false)} />}
    </header>
  );
}
