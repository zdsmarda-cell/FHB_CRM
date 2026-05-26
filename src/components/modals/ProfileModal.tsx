import React, { useState } from 'react';
import { X, Lock, FileText, Download } from 'lucide-react';
import { useStore, hashPassword } from '../../store';
import { useTranslation } from 'react-i18next';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { t, i18n } = useTranslation();
  const { currentUser, changePassword } = useStore();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  if (!currentUser) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: t('auth.passwordsDoNotMatch', 'Passwords do not match') });
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: t('auth.passwordTooShort', 'Password must be at least 6 characters') });
      return;
    }

    const { success, error } = await changePassword(
      hashPassword(currentPassword),
      hashPassword(newPassword)
    );

    if (success) {
      setPasswordStatus({ type: 'success', message: t('auth.passwordChangedSuccess', 'Password changed successfully') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordStatus({ type: 'error', message: error || t('auth.passwordChangeFailed', 'Failed to change password') });
    }
  };

  const manualUrl = i18n.language === 'cs' ? '/manual-cs.pdf' : '/manual-en.pdf';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">{t('profile.title', 'Můj profil')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold mb-3">
              {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{currentUser.name}</h3>
            <p className="text-sm text-gray-500">{currentUser.email}</p>
            <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
              {t(`roles.${currentUser.role}`)}
            </span>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 mb-6 bg-gray-50/50">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              {t('profile.changePassword', 'Změna hesla')}
            </h4>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder={t('profile.currentPassword', 'Původní heslo')}
                  className="w-full text-sm py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  placeholder={t('profile.newPassword', 'Nové heslo')}
                  className="w-full text-sm py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder={t('profile.confirmNewPassword', 'Nové heslo znovu')}
                  className="w-full text-sm py-2 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {passwordStatus && (
                <div className={`p-2 rounded text-xs font-medium ${passwordStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passwordStatus.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-medium py-2 rounded hover:bg-indigo-700 transition-colors text-sm"
              >
                {t('profile.savePassword', 'Změnit heslo')}
              </button>
            </form>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 opacity-90 hover:opacity-100 transition-opacity">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              {t('profile.manual', 'Manuál')}
            </h4>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {t('profile.manualDescription', 'Stáhněte si kompletní uživatelský manuál aplikace ve formátu PDF pro Vaši roli.')}
            </p>
            <a
              href={manualUrl}
              target="_blank"
              download
              className="flex items-center justify-center gap-2 w-full border border-gray-300 bg-white text-gray-700 font-medium py-2 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              {t('profile.downloadManual', 'Stáhnout návod (PDF)')}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
