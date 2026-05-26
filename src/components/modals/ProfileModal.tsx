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
  
  // New state for inline errors
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!currentUser) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);
    
    let currentErrors: any = {};
    let hasError = false;

    if (!currentPassword) {
      currentErrors.currentPassword = t('profile.errors.currentRequired', 'Zadejte stávající heslo.');
      hasError = true;
    }

    if (newPassword.length < 6) {
      currentErrors.newPassword = t('profile.errors.passwordTooShort', 'Nové heslo musí mít alespoň 6 znaků.');
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      currentErrors.confirmPassword = t('profile.errors.passwordsDoNotMatch', 'Nové heslo a jeho kontrola se neshodují.');
      hasError = true;
    }

    if (hasError) {
      setErrors(currentErrors);
      return;
    }

    const { success, error } = await changePassword(
      hashPassword(currentPassword),
      hashPassword(newPassword)
    );

    if (success) {
      setSuccessMessage(t('profile.successMessage', 'Heslo bylo úspěšně změněno.'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      if (error === 'invalid_current_password' || error?.includes('Current password is incorrect')) {
        setErrors({ currentPassword: t('profile.errors.invalidCurrent', 'Zadané stávající heslo není správné.') });
      } else {
        setErrors({ general: error || t('profile.errors.general', 'Nepodařilo se změnit heslo.') });
      }
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
              {t(`roles.${currentUser.role}`, currentUser.role)}
            </span>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 mb-6 bg-gray-50/50">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              {t('profile.changePassword', 'Změna hesla')}
            </h4>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('profile.currentPasswordDesc', 'Zadejte své aktuální heslo pro ověření identity')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.currentPassword', 'Původní heslo')}
                  className={`w-full text-sm py-2 px-3 border rounded focus:outline-none focus:ring-1 ${
                    errors.currentPassword 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50 text-red-900' 
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('profile.newPasswordDesc', 'Nové heslo musí obsahovat alespoň 6 znaků')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.newPassword', 'Nové heslo')}
                  className={`w-full text-sm py-2 px-3 border rounded focus:outline-none focus:ring-1 ${
                    errors.newPassword 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50 text-red-900' 
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('profile.confirmNewPasswordDesc', 'Zadejte nové heslo znovu pro kontrolu překlepů')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.confirmNewPassword', 'Nové heslo znovu')}
                  className={`w-full text-sm py-2 px-3 border rounded focus:outline-none focus:ring-1 ${
                    errors.confirmPassword 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50 text-red-900' 
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {errors.general && (
                <div className="p-2 rounded text-xs font-medium bg-red-50 text-red-700">
                  {errors.general}
                </div>
              )}
              
              {successMessage && (
                <div className="p-2 rounded text-xs font-medium bg-green-50 text-green-700">
                  {successMessage}
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
              href={`${manualUrl}?t=${new Date().getTime()}`}
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
