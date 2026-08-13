import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit2, UserPlus, CheckCircle2, XCircle, Mail, Bell, Play, Trash2, Clock, Plus } from 'lucide-react';
import { UserForm } from '../modals/UserForm';
import { User, Stage } from '../../types';
import { EmailLogsTable } from './EmailLogsTable';
import { LoginLogsTable } from './LoginLogsTable';

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

const ReminderSection: React.FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const { stageReminders, addStageReminder, deleteStageReminder, runRemindersCronNow } = store;

  const [selectedStage, setSelectedStage] = useState<Stage>('opportunity');
  const [daysInput, setDaysInput] = useState<string>('');
  const [actionInput, setActionInput] = useState<'' | 'email'>('');
  const [colorInput, setColorInput] = useState<'none' | 'yellow' | 'orange' | 'red'>('yellow');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cronStatus, setCronStatus] = useState<string | null>(null);
  const [isCronRunning, setIsCronRunning] = useState<boolean>(false);

  const stages: { key: Stage; label: string }[] = [
    { key: 'opportunity', label: '1. Oportunita' },
    { key: 'lead', label: '2. Lead' },
    { key: 'discovery_proposal', label: '3. Discovery & Ponuka' },
    { key: 'contracting', label: '4. Contracting' },
    { key: 'onboarding', label: '5. Onboarding' },
    { key: 'farming', label: '6. Farming' },
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days <= 0) {
      setErrorMsg('Zadejte platné celé číslo dní větší než 0.');
      return;
    }

    const exists = stageReminders.some(r => r.stage === selectedStage && r.days === days);
    if (exists) {
      setErrorMsg(t('admin.duplicateDaysError'));
      return;
    }

    await addStageReminder({
      stage: selectedStage,
      days,
      action: actionInput,
      color: colorInput
    });

    setDaysInput('');
    setActionInput('');
    setColorInput('yellow');
  };

  const handleRunCron = async () => {
    setIsCronRunning(true);
    setCronStatus(null);
    try {
      const res = await runRemindersCronNow();
      setCronStatus(`Test spuštěn: Zkontrolováno ${res.checked} příležitostí, odesláno ${res.sent} e-mailů.`);
    } catch (err: any) {
      setCronStatus(`Chyba při spuštění cronu: ${err.message}`);
    } finally {
      setIsCronRunning(false);
    }
  };

  const getColorBadge = (color: string) => {
    switch (color) {
      case 'yellow':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 border border-yellow-400">Žlutá</span>;
      case 'orange':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800 border border-orange-400">Oranžová</span>;
      case 'red':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800 border border-red-400">Červená</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600 border border-gray-300">Žádná</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            {t('admin.remindersTitle')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.remindersDesc')}
          </p>
        </div>
        <button
          onClick={handleRunCron}
          disabled={isCronRunning}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          {isCronRunning ? 'Probíhá kontrola...' : t('admin.runCronNow')}
        </button>
      </div>

      {cronStatus && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${cronStatus.includes('Chyba') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
          {cronStatus}
        </div>
      )}

      {/* Add New Reminder Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          {t('admin.addReminder')}
        </h4>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stav (Fáze)</label>
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value as Stage)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {stages.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.daysCount')}</label>
            <input
              type="number"
              min="1"
              step="1"
              value={daysInput}
              onChange={e => setDaysInput(e.target.value)}
              placeholder="Např. 7"
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.action')}</label>
            <select
              value={actionInput}
              onChange={e => setActionInput(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">{t('admin.actionNone')}</option>
              <option value="email">{t('admin.actionEmail')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.color')}</label>
            <select
              value={colorInput}
              onChange={e => setColorInput(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="none">{t('admin.colorNone')}</option>
              <option value="yellow">{t('admin.colorYellow')}</option>
              <option value="orange">{t('admin.colorOrange')}</option>
              <option value="red">{t('admin.colorRed')}</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-md transition"
            >
              {t('common.add')}
            </button>
          </div>
        </form>

        {errorMsg && (
          <p className="text-xs text-red-600 mt-2 font-medium">{errorMsg}</p>
        )}
      </div>

      {/* Rules list per stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stages.map(stg => {
          const rules = stageReminders.filter(r => r.stage === stg.key).sort((a, b) => a.days - b.days);
          return (
            <div key={stg.key} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h5 className="font-bold text-gray-800 pb-3 border-b border-gray-100 flex items-center justify-between">
                <span>{stg.label}</span>
                <span className="text-xs font-normal text-gray-500">Pravidel: {rules.length}</span>
              </h5>

              {rules.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Pro tento stav nebyly definovány žádné připomínky.</p>
              ) : (
                <ul className="divide-y divide-gray-100 mt-2">
                  {rules.map(rule => (
                    <li key={rule.id} className="py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-semibold text-gray-800">
                            Po {rule.days} dnech
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>Akce: {rule.action === 'email' ? 'Odeslat e-mail' : 'Žádná'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getColorBadge(rule.color)}
                        <button
                          onClick={() => deleteStageReminder(rule.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                          title="Smazat pravidlo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function AdminPanel() {
  const { t } = useTranslation();
  const store = useStore();
  const { users, currentUser } = store;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabDefault = (searchParams.get('tab') as 'users' | 'emails' | 'logins' | 'reminders' | 'settings') || 'users';
  const activeTab = activeTabDefault;
  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [newLeadSource, setNewLeadSource] = useState('');
  const [newSegment, setNewSegment] = useState('');
  const [newEcommercePlatform, setNewEcommercePlatform] = useState('');
  const [newStorageType, setNewStorageType] = useState('');
  const [newItIntegration, setNewItIntegration] = useState('');
  const [newLostReason, setNewLostReason] = useState('');
  const [newContactPosition, setNewContactPosition] = useState('');

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
          onClick={() => setActiveTab('logins')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logins' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('admin.loginLogs', 'Přihlášení')}
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'reminders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('admin.remindersTab', 'Upozornění (Reminder)')}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('admin.settings')}
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
      ) : activeTab === 'logins' ? (
        <LoginLogsTable />
      ) : activeTab === 'reminders' ? (
        <ReminderSection />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lead Sources */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.leadSourcesTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLeadSource}
                onChange={e => setNewLeadSource(e.target.value)}
                placeholder={t('admin.newLeadSource')}
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
                {t('common.add')}
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
                <li className="py-3 text-sm text-gray-500">{t('admin.noLeadSources')}</li>
              )}
            </ul>
          </div>
          
          {/* Segments */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.segmentsTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSegment}
                onChange={e => setNewSegment(e.target.value)}
                placeholder={t('admin.newSegment')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newSegment.trim()) {
                    store.addSegment(newSegment.trim());
                    setNewSegment('');
                  }
                }}
                disabled={!newSegment.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {t('common.add')}
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.segments.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateSegment(s.id, { name })}
                  onToggleActive={() => store.updateSegment(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteSegment(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.companies.some(c => c.segment === s.id)}
                />
              ))}
              {store.segments.length === 0 && (
                <li className="py-3 text-sm text-gray-500">{t('admin.noSegments')}</li>
              )}
            </ul>
          </div>
          
          {/* Ecommerce Platforms */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.ecommercePlatformsTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newEcommercePlatform}
                onChange={e => setNewEcommercePlatform(e.target.value)}
                placeholder={t('admin.newEcommercePlatform')}
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
                {t('common.add')}
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
                <li className="py-3 text-sm text-gray-500">{t('admin.noEcommercePlatforms')}</li>
              )}
            </ul>
          </div>

                    {/* Storage Types */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('deal.attributes.currentStorage', 'Stávající skladování')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStorageType}
                onChange={e => setNewStorageType(e.target.value)}
                placeholder="Nový typ skladování"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newStorageType.trim()) {
                    store.addStorageType(newStorageType.trim());
                    setNewStorageType('');
                  }
                }}
                disabled={!newStorageType.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {t('common.add')}
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.storageTypes.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateStorageType(s.id, { name })}
                  onToggleActive={() => store.updateStorageType(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteStorageType(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.deals.some(d => d.storageTypeId === s.id)}
                />
              ))}
              {store.storageTypes.length === 0 && (
                <li className="py-3 text-sm text-gray-500">{t('common.noStorageTypes', 'Žádné typy skladování')}</li>
              )}
            </ul>
          </div>

          {/* IT Integrations */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.itIntegrationsTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newItIntegration}
                onChange={e => setNewItIntegration(e.target.value)}
                placeholder={t('admin.newItIntegration')}
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
                {t('common.add')}
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
                <li className="py-3 text-sm text-gray-500">{t('admin.noItIntegrations')}</li>
              )}
            </ul>
          </div>
          
          {/* Lost Reasons */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.lostReasonsTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLostReason}
                onChange={e => setNewLostReason(e.target.value)}
                placeholder={t('admin.newLostReason')}
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
                {t('common.add')}
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
                <li className="py-3 text-sm text-gray-500">{t('admin.noLostReasons')}</li>
              )}
            </ul>
          </div>

          {/* Contact Positions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.contactPositionsTitle')}</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newContactPosition}
                onChange={e => setNewContactPosition(e.target.value)}
                placeholder={t('admin.newContactPosition')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={() => {
                  if (newContactPosition.trim()) {
                    store.addContactPosition(newContactPosition.trim());
                    setNewContactPosition('');
                  }
                }}
                disabled={!newContactPosition.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {t('common.add')}
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {store.contactPositions.map(s => (
                <EditableAttributeItem
                  key={s.id}
                  item={s}
                  onUpdateName={(name) => store.updateContactPosition(s.id, { name })}
                  onToggleActive={() => store.updateContactPosition(s.id, { isActive: !s.isActive })}
                  onDelete={() => store.deleteContactPosition(s.id).catch(err => alert(err.message))}
                  isDeleteDisabled={store.companies.some(c => (c.contacts || []).some(contact => contact.position === s.id))}
                />
              ))}
              {store.contactPositions.length === 0 && (
                <li className="py-3 text-sm text-gray-500">{t('admin.noContactPositions')}</li>
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
