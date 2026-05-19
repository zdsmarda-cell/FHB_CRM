import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Edit2, UserPlus, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { UserForm } from '../modals/UserForm';
import { User } from '../../types';
import { EmailLogsTable } from './EmailLogsTable';

import { ConfirmModal } from '../modals/ConfirmModal';

const EditableAttributeItem: React.FC<{
  item: any;
  onUpdateName: (name: string) => void | Promise<void>;
  onToggleActive: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  isDeleteDisabled: boolean;
}> = ({
  item,
  onUpdateName,
  onToggleActive,
  onDelete,
  isDeleteDisabled
}) => {
  const [val, setVal] = React.useState(item.name);
  const [showConfirm, setShowConfirm] = React.useState(false);
  React.useEffect(() => { setVal(item.name); }, [item.name]);

  return (
    <>
      <li className="py-3 flex justify-between items-center group gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => { if (val !== item.name) onUpdateName(val); }}
          className={`flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1 py-0.5 transition-colors ${item.isActive === false ? 'text-gray-400 line-through' : 'text-gray-700'}`}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className="text-xs text-gray-500 hover:text-gray-800 border px-2 py-1 rounded"
          >
            {item.isActive === false ? 'Aktivovat' : 'Deaktivovat'}
          </button>
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={isDeleteDisabled}
            className={`transition-opacity p-1 rounded ${isDeleteDisabled ? 'text-gray-300 cursor-not-allowed opacity-100' : 'text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50'}`}
            title={isDeleteDisabled ? 'Nelze smazat (je přiřazeno k příležitostem)' : 'Smazat'}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </li>
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onDelete}
        title="Smazat položku"
        message="Opravdu chcete tuto položku smazat? Tato akce je nevratná."
        confirmText="Smazat"
      />
    </>
  );
};

export function AdminPanel() {
  const { t } = useTranslation();
  const store = useStore();
  const { users } = store;

  const [activeTab, setActiveTab] = useState<'users' | 'emails' | 'settings'>('users');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [newLeadSource, setNewLeadSource] = useState('');
  const [newEcommercePlatform, setNewEcommercePlatform] = useState('');
  const [newItIntegration, setNewItIntegration] = useState('');
  const [newLostReason, setNewLostReason] = useState('');

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
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Nastavení (Číselníky)
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
      ) : activeTab === 'emails' ? (
        <EmailLogsTable />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lead Sources */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Zdroje leadů</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLeadSource}
                onChange={e => setNewLeadSource(e.target.value)}
                placeholder="Nový zdroj leadu"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newLeadSource.trim()) {
                    store.addLeadSource(newLeadSource.trim());
                    setNewLeadSource('');
                  }
                }}
                disabled={!newLeadSource.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                Přidat
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.leadSources.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateLeadSource(s.id, { name })}
                  onToggleActive={() => store.updateLeadSource(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteLeadSource(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.leadSourceId === s.id)}
                />
              ))}
              {store.leadSources.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Zatím žádné zdroje leadů.</li>
              )}
            </ul>
          </div>
          
          {/* Ecommerce Platforms */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">E-commerce platformy</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newEcommercePlatform}
                onChange={e => setNewEcommercePlatform(e.target.value)}
                placeholder="Nová e-commerce platforma"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newEcommercePlatform.trim()) {
                    store.addEcommercePlatform(newEcommercePlatform.trim());
                    setNewEcommercePlatform('');
                  }
                }}
                disabled={!newEcommercePlatform.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                Přidat
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.ecommercePlatforms.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateEcommercePlatform(s.id, { name })}
                  onToggleActive={() => store.updateEcommercePlatform(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteEcommercePlatform(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.ecommercePlatformId === s.id)}
                />
              ))}
              {store.ecommercePlatforms.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Zatím žádné e-commerce platformy.</li>
              )}
            </ul>
          </div>

          {/* IT Integrations */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Požadavek na IT integraci</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newItIntegration}
                onChange={e => setNewItIntegration(e.target.value)}
                placeholder="Nová IT integrace"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newItIntegration.trim()) {
                    store.addITIntegration(newItIntegration.trim());
                    setNewItIntegration('');
                  }
                }}
                disabled={!newItIntegration.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                Přidat
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.itIntegrations.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateITIntegration(s.id, { name })}
                  onToggleActive={() => store.updateITIntegration(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteITIntegration(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.itIntegrationId === s.id)}
                />
              ))}
              {store.itIntegrations.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Zatím žádné IT integrace.</li>
              )}
            </ul>
          </div>
          
          {/* Lost Reasons */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Důvody ztráty</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLostReason}
                onChange={e => setNewLostReason(e.target.value)}
                placeholder="Nový důvod ztráty"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newLostReason.trim()) {
                    store.addLostReason(newLostReason.trim());
                    setNewLostReason('');
                  }
                }}
                disabled={!newLostReason.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                Přidat
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.lostReasons.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateLostReason(s.id, { name })}
                  onToggleActive={() => store.updateLostReason(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteLostReason(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.lostReasonId === s.id)}
                />
              ))}
              {store.lostReasons.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Zatím žádné důvody ztráty.</li>
              )}
            </ul>
          </div>
        </div>
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
