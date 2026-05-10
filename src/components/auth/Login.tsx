import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, hashPassword } from '../../store';
import { Briefcase, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, requestPasswordReset } = useStore();
  
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetTokenInfo, setResetTokenInfo] = useState(''); // Only for dev simulation

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      login(email, hashPassword(password));
      navigate('/');
    } catch (err: any) {
      setError(t(`auth.${err.message}`) || err.message);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const token = requestPasswordReset(email);
    setResetSent(true);
    if (token) {
      // In a real app, we would send an email here.
      // Since this is a prototype without a backend email server, we show it on screen.
      setResetTokenInfo(`${window.location.origin}/#/reset-password/${token}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-indigo-600">
          <Briefcase className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('appName')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isForgot ? t('auth.resetPassword') : t('auth.login')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-md">
                {t('auth.checkEmail')}
              </div>
              
              {/* Development simulation - delete in production */}
              {resetTokenInfo && (
                <div className="mt-4 break-all bg-gray-100 p-3 rounded text-xs text-gray-500 text-left border border-gray-200">
                  <strong>[DEV SIMULATION] Email Content:</strong><br />
                  Click link to reset: <a href={resetTokenInfo} className="text-indigo-600 underline">{resetTokenInfo}</a>
                </div>
              )}

              <button
                onClick={() => { setIsForgot(false); setResetSent(false); }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : isForgot ? (
            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {t('auth.sendResetLink')}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 sm:text-sm rounded-md py-3 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    placeholder="admin@fhb.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full px-4 py-3 sm:text-sm rounded-md shadow-sm ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    placeholder="password123"
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button type="button" onClick={() => setIsForgot(true)} className="font-medium text-indigo-600 hover:text-indigo-500">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {t('auth.signIn')}
                </button>
              </div>
            </form>
          )}

          {!resetSent && !isForgot && (
             <div className="mt-6 text-xs text-gray-500 text-center">
                Demo Accounts:<br />
                admin@fhb.com | cso@fhb.com | hunter1@fhb.com<br/>
                Password for all: <strong>password123</strong>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
