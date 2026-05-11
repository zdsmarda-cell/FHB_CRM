import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Region, Segment, Company } from '../../types';
import { X, Plus, Trash2 } from 'lucide-react';
import { COUNTRIES, getRegionForCountry, PHONE_PREFIXES, getDefaultPhonePrefixForCountry } from '../../lib/countryMapping';
import { canViewStage, getSubordinateIds } from '../../lib/permissions';

interface CompanyFormProps {
  onClose: () => void;
}

export function CompanyForm({ onClose }: CompanyFormProps) {
  const { t } = useTranslation();
  const { addCompanyAndDeal, currentUser, companies, users } = useStore();
  const [icoError, setIcoError] = useState<string>('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [ownerId, setOwnerId] = useState<string>('');

  const selectableUsers = useMemo(() => {
    if (!currentUser) return [];

    const isGlobal = currentUser.role === 'administrator' || currentUser.role === 'cso';
    const subIds = getSubordinateIds(users, currentUser.id);

    return users.filter(user => {
      if (!user.isActive) return false;
      const hasStagePerm = canViewStage(user, 'lead_opportunity');
      if (!hasStagePerm) return false;

      if (isGlobal) {
        return true;
      } else {
        return subIds.includes(user.id);
      }
    });

  }, [users, currentUser]);

  const [formData, setFormData] = useState<Omit<Company, 'id'>>({
    companyId: '',
    name: '',
    address: '',
    country: 'Czechia',
    region: 'SK_CZ',
    segment: 'fashion',
    email: '',
    phone: '',
    phonePrefix: getDefaultPhonePrefixForCountry('Czechia'),
    urls: [''],
    contacts: []
  });

  const handleCountryChange = (country: string) => {
    const region = getRegionForCountry(country) as Region;
    const phonePrefix = getDefaultPhonePrefixForCountry(country);
    setFormData(prev => ({ ...prev, country, region, phonePrefix }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitAttempted(true);
    setIcoError('');
    
    if (!formData.companyId || !formData.name || !formData.address || !formData.email) {
      return;
    }

    // Check if IČO already exists directly to avoid catching generic errors
    if (companies.some(c => c.companyId === formData.companyId)) {
        setIcoError(t('errors.icoExists'));
        return;
    }

    try {
      await addCompanyAndDeal(formData, currentUser.id, ownerId || null);
      onClose();
    } catch (err: any) {
      if (err.message === 'icoExists') {
        setIcoError(t('errors.icoExists'));
      } else {
        setIcoError(err.message || t('errors.generalError'));
      }
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = value;
    setFormData({ ...formData, urls: newUrls });
  };

  const addUrl = () => {
    setFormData({ ...formData, urls: [...formData.urls, ''] });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">{t('menu.newDeal')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.ico')} *</label>
              <input required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !formData.companyId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : (icoError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500')} rounded-lg shadow-sm text-sm`} />
              {submitAttempted && !formData.companyId && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
              {icoError && <p className="mt-1 text-sm text-red-600">{icoError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.companyName')} *</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !formData.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg shadow-sm text-sm`} />
              {submitAttempted && !formData.name && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.address')} *</label>
            <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !formData.address ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg shadow-sm text-sm`} />
            {submitAttempted && !formData.address && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select value={formData.country} onChange={e => handleCountryChange(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.region')}</label>
              <select disabled value={formData.region} onChange={e => setFormData({...formData, region: e.target.value as Region})} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-500 text-sm">
                <option value="SK_CZ">SK & CZ</option>
                <option value="CEE">CEE (HU, RO, PL)</option>
                <option value="DACH">DACH (DE, AT, CH)</option>
                <option value="EUROPE">Europe</option>
                <option value="WORLD">World</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.segment')}</label>
              <select value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value as Segment})} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                <option value="fashion">Fashion</option>
                <option value="electronics">Electronics</option>
                <option value="toys">Toys</option>
                <option value="software">Software</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Přidělený řešitel / Assignee</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm">
                <option value="">bez řešitele</option>
                {selectableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')} *</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-3 border ${submitAttempted && !formData.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded-lg shadow-sm text-sm`} />
              {submitAttempted && !formData.email && <p className="mt-1 text-sm text-red-600">{t('errors.requiredField')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.phone')}</label>
              <div className="flex gap-2">
                <select 
                  value={formData.phonePrefix} 
                  onChange={e => setFormData({...formData, phonePrefix: e.target.value})} 
                  className="w-1/3 px-2 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  {PHONE_PREFIXES.map(p => (
                    <option key={`${p.country}-${p.code}`} value={p.code}>
                      {p.flag} {p.code}
                    </option>
                  ))}
                </select>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-2/3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" 
                  placeholder="123 456 789"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('fields.urls')}</label>
            {formData.urls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input value={url} onChange={e => handleUrlChange(index, e.target.value)} placeholder="https://" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm" />
              </div>
            ))}
            <button type="button" onClick={addUrl} className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800">
              <Plus className="w-4 h-4" /> Add URL
            </button>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
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
