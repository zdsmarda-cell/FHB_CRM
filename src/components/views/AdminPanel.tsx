import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Edit2, UserPlus, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { UserForm } from '../modals/UserForm';
import { User } from '../../types';
import { EmailLogsTable } from './EmailLogsTable';

export function AdminPanel() {
  const { t } = useTranslation();
  const store = useStore();
  const { users } = store;

  const [activeTab, setActiveTab] = useState<'users' | 'emails'>('users');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  React.useEffect(() => {
    store.refreshState();
  }, []);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('menu.admin')}</h2>
        
        {activeTab === 'users' && (
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            {t('admin.addUser')}
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('admin.users')}
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'emails' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('admin.emailLogs')}
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">{t('admin.name')}</th>
              <th className="px-6 py-4 font-medium">{t('auth.email')}</th>
              <th className="px-6 py-4 font-medium">{t('admin.role')}</th>
              <th className="px-6 py-4 font-medium">{t('admin.status')}</th>
              <th className="px-6 py-4 font-medium">{t('admin.manager')}</th>
              <th className="px-6 py-4 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const manager = users.find(u => u.id === user.managerId);
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                      {t(`roles.${user.role}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {t('admin.active')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <XCircle className="w-4 h-4 text-gray-400" />
                        {t('admin.inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {manager ? manager.name : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      title={t('admin.editUser')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      ) : (
        <EmailLogsTable />
      )}

      {isFormOpen && (
        <UserForm 
          userToEdit={editingUser} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
