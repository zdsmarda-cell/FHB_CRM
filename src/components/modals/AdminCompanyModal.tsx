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
  onSaveSuccess: () => void;
}

export function AdminCompanyModal({ company, onClose, onSaveSuccess }: AdminCompanyModalProps) {
  const { t } = useTranslation();
  const { updateCompany, currentUser, companies, segments, deals } = useStore();
  const [formData, setFormData] = useState<Company>(company);
  const activeSegments = React.useMemo(() => segments.filter(s => s.isActive), [segments]);
  const [activeTab, setActiveTab] = useState<'info' | 'contacts'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [icoError, setIcoError] = useState('');
  const [contactSubmitAttempted, setContactSubmitAttempted] = useState(false);
  const [contactError, setContactError] = useState('');
  
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

  const [urlError, setUrlError] = useState('');

  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    
    setSubmitAttempted(true);
    setIcoError('');
    setUrlError('');
    
    const validUrls = (formData.urls || []).filter(u => u.trim() !== '');

    if (!formData.name || !formData.address || validUrls.length === 0) {
      return;
    }

    const companyDeals = deals.filter(d => d.companyId === company.id);
    const isPastOpportunity = companyDeals.some(d => d.stage !== 'opportunity' && !(d.stage === 'lost' && d.lostFromStage === 'opportunity'));
    
    if (isPastOpportunity && (!formData.companyId || formData.companyId.trim() === '')) {
      setIcoError(t('errors.icoRequiredFromLead'));
      return;
    }

    if (formData.companyId && formData.companyId.trim() !== '') {
      if (companies.some(c => c.companyId === formData.companyId?.trim() && c.id !== company.id)) {
          setIcoError(t('errors.icoExists'));
          return;
      }
    }

    const hasUrlConflict = companies.some(c => 
      c.id !== company.id && c.urls?.some(url => validUrls.includes(url) && url.trim() !== '')
    );

    if (hasUrlConflict) {
      setUrlError(t('errors.urlExists', 'Tato URL adresa již existuje v systému.'));
      return;
    }

    setIsSaving(true);
    try {
      await updateCompany(company.id, {...formData, urls: validUrls}, currentUser.id);
      onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.message === 'icoExists') {
        setIcoError(t('errors.icoExists'));
      } else if (err.message === 'urlExists') {
        setUrlError(t('errors.urlExists', 'Tato URL adresa již existuje v systému.'));
      } else if (err.message && err.message.includes('Unknown column')) {
        setIcoError(t('errors.dbColumnError'));
      } else {
        setIcoError(err.message || t('errors.generalError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = () => {
    setContactSubmitAttempted(true);
    setContactError('');

    if (!newContactName.trim() || (!newContactEmail.trim() && !newContactPhone.trim())) {
      setContactError(t('errors.emailOrPhoneRequired'));
      return;
    }

    if (newContactEmail.trim()) {
      const emailExists = companies.some(c => 
        c.contacts.some(contact => 
          contact.email?.toLowerCase() === newContactEmail.trim().toLowerCase()
        )
      );
      if (emailExists) {
        setContactError(t('errors.contactEmailExists'));
        return;
      }
    }

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
                  <input type="text" value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className={`w-full px-4 py-2 border rounded-lg focus:ring-1 ${icoError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {icoError && <p className="mt-1 text-sm text-red-600">{icoError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.companyName')} *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-2 border rounded-lg focus:ring-1 ${submitAttempted && !formData.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  {submitAttempted && !formData.name && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.address')} *</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`w-full px-4 py-2 border rounded-lg focus:ring-1 ${submitAttempted && !formData.address ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {submitAttempted && !formData.address && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
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
                  <select value={formData.segment || ''} onChange={e => setFormData({...formData, segment: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                    <option value="" disabled>{t('fields.segment')}</option>
                    {activeSegments.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')}</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-2 border rounded-lg focus:ring-1 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500`} />
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
                  <label className="block text-sm font-medium text-gray-700">URLs *</label>
                  <button type="button" onClick={() => setFormData({...formData, urls: [...formData.urls, '']})} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"><Plus className="w-3 h-3" /> Přidat URL</button>
                </div>
                <div className="space-y-2">
                  {formData.urls.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="url" value={url} onChange={e => {
                        const newUrls = [...formData.urls];
                        newUrls[i] = e.target.value;
                        setFormData({...formData, urls: newUrls});
                      }} className={`flex-1 px-4 py-2 border rounded-lg focus:ring-1 ${submitAttempted && (formData.urls || []).filter(u => u.trim() !== '').length === 0 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : (urlError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500')}`} />
                      {formData.urls.length > 1 && (
                        <button type="button" onClick={() => {
                          const newUrls = formData.urls.filter((_, idx) => idx !== i);
                          setFormData({...formData, urls: newUrls});
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"><Trash2 className="w-5 h-5" /></button>
                      )}
                    </div>
                  ))}
                  {submitAttempted && (formData.urls || []).filter(u => u.trim() !== '').length === 0 && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
                  {urlError && <p className="mt-1 text-sm text-red-600">{urlError}</p>}
                </div>
              </div>
            </form>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jméno *</label>
                    <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} className={`w-full px-3 py-2 text-sm border rounded focus:ring-1 outline-none ${contactSubmitAttempted && !newContactName.trim() ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pozice</label>
                    <input type="text" value={newContactPosition} onChange={e => setNewContactPosition(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className={`w-full px-3 py-2 text-sm border rounded focus:ring-1 outline-none ${contactSubmitAttempted && !newContactEmail.trim() && !newContactPhone.trim() ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                    <input type="tel" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className={`w-full px-3 py-2 text-sm border rounded focus:ring-1 outline-none ${contactSubmitAttempted && !newContactEmail.trim() && !newContactPhone.trim() ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                  </div>
                  <button 
                    onClick={handleAddContact}
                    className="px-4 py-2 bg-indigo-600 text-white rounded font-medium text-sm hover:bg-indigo-700 w-full sm:w-auto"
                  >
                    Přidat
                  </button>
                </div>
                {contactError && <p className="mt-2 text-sm text-red-600">{contactError}</p>}
                {contactSubmitAttempted && !newContactName.trim() && <p className="mt-2 text-sm text-red-600">{t('errors.requiredField')}</p>}
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
