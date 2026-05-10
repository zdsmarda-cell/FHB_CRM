import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, hashPassword } from '../../store';
import { Role, User } from '../../types';
import { X } from 'lucide-react';

interface UserFormProps {
  userToEdit?: User;
  onClose: () => void;
}

export function UserForm({ userToEdit, onClose }: UserFormProps) {
  const { t } = useTranslation();
  const { addUser, updateUser, users } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'hunter' as Role,
    managerId: '',
    isActive: true,
    password: '' // Only needed for new users
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        managerId: userToEdit.managerId || '',
        isActive: userToEdit.isActive,
        password: '' // Don't show existing password
      });
    }
  }, [userToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError(null);
    
    if (!formData.name || !formData.email || (!userToEdit && !formData.password)) {
      return;
    }

    try {
      if (userToEdit) {
        updateUser(userToEdit.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          managerId: formData.managerId || null,
          isActive: formData.isActive,
          ...(formData.password ? { passwordHash: hashPassword(formData.password) } : {})
        });
      } else {
        addUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          managerId: formData.managerId || null,
          isActive: formData.isActive,
          passwordHash: hashPassword(formData.password || 'password123')
        });
      }
      onClose();
    } catch (err: any) {
      if (err.message === 'emailExists') {
        setError(t('errors.emailExists'));
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {userToEdit ? t('admin.editUser') : t('admin.addUser')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.name')} *</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !formData.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg shadow-sm text-sm`} />
            {submitAttempted && !formData.name && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')} *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm ${error || (submitAttempted && !formData.email) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`} />
            {submitAttempted && !formData.email && !error && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')} {userToEdit && '(Leave blank to keep)'}</label>
            <input type="password" required={!userToEdit} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !userToEdit && !formData.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg shadow-sm text-sm`} />
            {submitAttempted && !userToEdit && !formData.password && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.role')}</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                <option value="hunter">{t('roles.hunter')}</option>
                <option value="closer">{t('roles.closer')}</option>
                <option value="farmer">{t('roles.farmer')}</option>
                <option value="cso">{t('roles.cso')}</option>
                <option value="administrator">{t('roles.administrator')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.manager')}</label>
              <select value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                <option value="">-- None --</option>
                {users.filter(u => u.id !== userToEdit?.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center pt-2">
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" 
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 cursor-pointer">
              {t('admin.active')}
            </label>
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('common.cancel')}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
