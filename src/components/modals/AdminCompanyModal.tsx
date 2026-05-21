import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Company, Region, Segment, Contact } from '../../types';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { COUNTRIES, getRegionForCountry, PHONE_PREFIXES, getDefaultPhonePrefixForCountry } from '../../lib/countryMapping';
import { v4 as uuidv4 } from 'uuid';

interface AdminCompanyModalProps {
  company: Company;
  onClose: () => void;
}

export function AdminCompanyModal({ company, onClose }: AdminCompanyModalProps) {
  const { t } = useTranslation();
  const { updateCompany, currentUser } = useStore();
  const [formData, setFormData] = useState<Company>(company);
  const [activeTab, setActiveTab] = useState<'info' | 'contacts'>('info');
  const [isSaving, setIsSaving] = useState(false);
  
  // Contact state
  const [contacts, setContacts] = useState<Contact[]>(company.contacts || []);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPosition, setNewContactPosition] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleCountryChange = (country: string) => {
    const region = getRegionForCountry(country as any) as Region;
    const phonePrefix = getDefaultPhonePrefixForCountry(country as any);
    setFormData(prev => ({ ...prev, country, region, phonePrefix }));
  };

  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateCompany(company.id, formData, currentUser.id);
      // don't close, just stop saving
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = () => {
    if (!newContactName) return;
    const newContact: Contact = {
      id: uuidv4(),
      name: newContactName,
      position: newContactPosition,
      email: newContactEmail || '',
      phone: newContactPhone || '',
      isActive: true
    };
    const newContacts = [...contacts, newContact];
    setContacts(newContacts);
    updateCompany(company.id, { contacts: newContacts }, currentUser?.id || '');
    setNewContactName('');
    setNewContactPosition('');
    setNewContactEmail('');
    setNewContactPhone('');
  };

  const handleRemoveContact = (id: string) => {
    const newContacts = contacts.filter(c => c.id !== id);
    setContacts(newContacts);
    updateCompany(company.id, { contacts: newContacts }, currentUser?.id || '');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">{company.name}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('info')}
          >
            Informace o společnosti
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('contacts')}
          >
            Kontakty ({contacts.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <form id="company-form" onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.ico')}</label>
                  <input type="text" value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.companyName')}</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.address')}</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.country')}</label>
                  <select value={formData.country || 'Czechia'} onChange={e => handleCountryChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    {COUNTRIES.map(cty => (
                      <option key={cty} value={cty}>{cty}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.region')}</label>
                  <input type="text" value={formData.region} disabled className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.segment')}</label>
                  <select value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value as Segment})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="fashion">Fashion</option>
                    <option value="electronics">Electronics</option>
                    <option value="toys">Toys</option>
                    <option value="software">Software</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')}</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.phone')}</label>
                  <div className="flex gap-2">
                    <select value={formData.phonePrefix || ''} onChange={e => setFormData({...formData, phonePrefix: e.target.value})} className="w-[120px] px-2 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white">
                      {PHONE_PREFIXES.map(p => (
                        <option key={p.code + p.country} value={p.code}>{p.code} {p.flag}</option>
                      ))}
                    </select>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">URLs</label>
                  <button type="button" onClick={() => setFormData({...formData, urls: [...formData.urls, '']})} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"><Plus className="w-3 h-3" /> Přidat URL</button>
                </div>
                <div className="space-y-2">
                  {formData.urls.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="url" value={url} onChange={e => {
                        const newUrls = [...formData.urls];
                        newUrls[i] = e.target.value;
                        setFormData({...formData, urls: newUrls});
                      }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                      {formData.urls.length > 1 && (
                        <button type="button" onClick={() => {
                          const newUrls = formData.urls.filter((_, idx) => idx !== i);
                          setFormData({...formData, urls: newUrls});
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"><Trash2 className="w-5 h-5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jméno *</label>
                  <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pozice</label>
                  <input type="text" value={newContactPosition} onChange={e => setNewContactPosition(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                  <input type="tel" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none" />
                </div>
                <button 
                  onClick={handleAddContact}
                  disabled={!newContactName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-medium text-sm disabled:opacity-50 hover:bg-indigo-700 w-full sm:w-auto"
                >
                  Přidat
                </button>
              </div>

              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {contacts.length === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-gray-500 bg-white">Zatím žádné kontakty.</li>
                ) : (
                  contacts.map(c => (
                    <li key={c.id} className="p-4 flex gap-4 items-center bg-white hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{c.name} {c.position && <span className="text-xs text-gray-500 font-normal ml-2">({c.position})</span>}</div>
                        <div className="text-sm text-gray-500 truncate flex gap-4">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveContact(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Smazat kontakt">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {activeTab === 'info' && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
              type="submit" 
              form="company-form"
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Ukládám...' : 'Uložit změny'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
