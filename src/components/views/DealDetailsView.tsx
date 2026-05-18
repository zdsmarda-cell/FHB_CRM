import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore, apiFetch } from '../../store';
import { ArrowLeft, Clock, User as UserIcon, Plus, X, Upload, Mail, Phone, Ban, Calendar, AlertTriangle, Video, MessageSquare, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { Contact, Company, Region, Segment, Deal, Activity, ActivityType, PricingOffer } from '../../types';
import { getSubordinateIds } from '../../lib/permissions';
import { PHONE_PREFIXES, getDefaultPhonePrefixForCountry } from '../../lib/countryMapping';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmModal } from '../modals/ConfirmModal';
import { AlertModal } from '../modals/AlertModal';

export function DealDetailsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const store = useStore();
  const { deals, companies, auditLogs, users, currentUser, updateCompany } = store;

  React.useEffect(() => {
    store.refreshState();
    if (id) {
      store.fetchDealDetails(id);
    }
  }, [id]);

  const deal = deals.find(d => d.id === id);
  const company = companies.find(c => c.id === deal?.companyId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;

  if (!deal || !company || !currentUser) {
    return <div className="p-6">Not found or unauthorized.</div>;
  }

  // Check edit rights
  const subordinateIds = getSubordinateIds(users, currentUser.id);
  const canEdit = currentUser.role === 'administrator' || 
                  currentUser.role === 'cso' || 
                  deal.hunterId === currentUser.id || 
                  deal.closerId === currentUser.id || 
                  deal.farmerId === currentUser.id || 
                  (deal.hunterId && subordinateIds.includes(deal.hunterId)) ||
                  (deal.closerId && subordinateIds.includes(deal.closerId)) ||
                  (deal.farmerId && subordinateIds.includes(deal.farmerId));

  const logs = auditLogs
    .filter(log => log.dealId === deal.id || log.companyId === company.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalHistoryPages = Math.ceil(logs.length / historyPerPage);
  const paginatedLogs = logs.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

  const handleEditClick = () => {
    setFormData(company);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateCompany(company.id, formData, currentUser.id);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{company.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('fields.ico')}: {company.companyId}</p>
          </div>
          
          <div className="ml-8 flex flex-wrap items-center gap-2">
            {[
              { role: 'Hunter', id: deal.hunterId },
              { role: 'Closer', id: deal.closerId },
              { role: 'Farmer', id: deal.farmerId }
            ].map(({ role, id }) => {
              if (!id) return null;
              const user = users.find(u => u.id === id);
              if (!user) return null;
              return (
                <div key={role} className="flex items-center gap-2 bg-white/60 border border-gray-200 rounded-lg pl-1.5 pr-3 py-1.5 shadow-sm" title={`${role}: ${user.name}`}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold leading-none">{role}</span>
                    <span className="text-gray-900 font-medium text-sm leading-none mt-1 truncate max-w-[120px]">{user.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {canEdit && !isEditing && (
          <button onClick={handleEditClick} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
            {t('common.edit')}
          </button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              {t('common.save')}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 border-gray-200 lg:border-r lg:pr-8 space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Company Details
            </h3>
            
            <CompanyDetailsForm 
              company={company} 
              isEditing={isEditing} 
              formData={formData} 
              setFormData={setFormData} 
            />

          </section>

          <section>
            <DealAttributesForm deal={deal} canEdit={canEdit} />
          </section>

          <section>
            <ContactsManager company={company} canEdit={canEdit} />
          </section>
          
          <section>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Deal Actions
              </h3>
            </div>
            <DealActionsManager deal={deal} canEdit={canEdit} />
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ActivitiesManager deal={deal} company={company} canEdit={canEdit} />

          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mt-8 pt-6 border-t border-gray-100">
            <Clock className="w-5 h-5 text-gray-400" />{t('common.history')}</h3>
          
          <div className="space-y-4">
            {paginatedLogs.map(log => {
              const user = users.find(u => u.id === log.changedBy);
              return (
                <div key={log.id} className="relative pl-4 border-l-2 border-indigo-100">
                  <div className="absolute w-2 h-2 rounded-full bg-indigo-500 -left-[5px] top-1"></div>
                  <p className="text-xs text-gray-500 mb-1">
                    {format(parseISO(log.timestamp), 'MMM d, HH:mm')}
                  </p>
                  <p className="text-sm text-gray-800">
                    Changed <span className="font-medium">{log.field}</span>
                  </p>
                  <div className="mt-1 bg-gray-50 p-2 rounded text-xs text-gray-600 border border-gray-200">
                    {log.oldValue && <span className="line-through mr-1 opacity-70 break-words">{log.oldValue}</span>}
                    <span className="font-medium text-indigo-700 break-words">{log.newValue}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <UserIcon className="w-3 h-3" />
                    {log.changedBy === 'System' ? 'System' : (user?.name || 'Unknown User')}
                  </div>
                </div>
              )
            })}
            {logs.length === 0 && <p className="text-sm text-gray-500">No history available.</p>}
          </div>
          
          {totalHistoryPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button 
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="text-sm text-indigo-600 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {historyPage} of {totalHistoryPages}</span>
              <button 
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="text-sm text-indigo-600 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyDetailsForm({ company, isEditing, formData, setFormData }: any) {
  const { t } = useTranslation();

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...(formData.urls || [])];
    newUrls[index] = value;
    setFormData({ ...formData, urls: newUrls });
  };

  const addUrl = () => {
    setFormData({ ...formData, urls: [...(formData.urls || []), ''] });
  };

  if (isEditing) {
    return (
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2 md:col-span-1">
          <label className="block text-gray-500 mb-1">{t('fields.ico')}</label>
          <input 
            value={formData.companyId || ''} 
            onChange={e => setFormData({ ...formData, companyId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-gray-500 mb-1">{t('fields.companyName')}</label>
          <input 
            value={formData.name || ''} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-gray-500 mb-1">{t('fields.address')}</label>
          <input 
            value={formData.address || ''} 
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">{t('fields.region')}</label>
          <select 
            value={formData.region || ''} 
            onChange={e => setFormData({ ...formData, region: e.target.value as Region })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="SK_CZ">SK & CZ</option>
            <option value="CEE">CEE (HU, RO, PL)</option>
            <option value="DACH">DACH (DE, AT, CH)</option>
            <option value="EUROPE">Europe (Other)</option>
            <option value="WORLD">Rest of World</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-500 mb-1">{t('fields.segment')}</label>
          <select 
            value={formData.segment || ''} 
            onChange={e => setFormData({ ...formData, segment: e.target.value as Segment })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="fashion">Fashion</option>
            <option value="electronics">Electronics</option>
            <option value="toys">Toys</option>
            <option value="software">Software</option>
            <option value="services">Services</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-500 mb-1">{t('fields.email')}</label>
          <input 
            value={formData.email || ''} 
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">{t('fields.phone')}</label>
          <div className="flex gap-2">
            <select 
              value={formData.phonePrefix || getDefaultPhonePrefixForCountry(company.country || '')} 
              onChange={e => setFormData({ ...formData, phonePrefix: e.target.value })}
              className="min-w-[140px] px-2 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">--</option>
              {PHONE_PREFIXES.map(p => (
                <option key={`${p.country}-${p.code}`} value={p.code}>
                  {p.flag} {p.code}
                </option>
              ))}
            </select>
            <input 
              value={formData.phone || ''} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-gray-500 mb-1">{t('fields.urls')}</label>
          {(formData.urls || []).map((url: string, index: number) => (
            <div key={index} className="flex gap-2 mb-2">
              <input 
                value={url} 
                onChange={e => handleUrlChange(index, e.target.value)} 
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          ))}
          <button type="button" onClick={addUrl} className="text-indigo-600 font-medium hover:underline text-sm">+ Add URL</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
      <div className="col-span-2 md:col-span-1">
        <span className="text-gray-500 block mb-1">{t('fields.address')}</span>
        <span className="font-medium text-gray-900">{company.address}</span>
      </div>
      <div>
        <span className="text-gray-500 block mb-1">{t('fields.region')}</span>
        <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{company.region}</span>
      </div>
      <div>
        <span className="text-gray-500 block mb-1">{t('fields.segment')}</span>
        <span className="font-medium text-gray-900 capitalize">{company.segment}</span>
      </div>
      <div>
        <span className="text-gray-500 block mb-1">{t('fields.email')}</span>
        <span className="font-medium text-gray-900">{company.email}</span>
      </div>
      <div>
        <span className="text-gray-500 block mb-1">{t('fields.phone')}</span>
        <span className="font-medium text-gray-900">{company.phone ? `${company.phonePrefix ? company.phonePrefix + ' ' : ''}${company.phone}` : '-'}</span>
      </div>
      <div className="col-span-2">
        <span className="text-gray-500 block mb-1">{t('fields.urls')}</span>
        <div className="flex flex-wrap gap-2">
          {company.urls?.map((url: string, i: number) => url ? (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{url}</a>
          ) : null)}
        </div>
      </div>
    </div>
  );
}

function DealAttributesForm({ deal, canEdit }: { deal: Deal, canEdit: boolean }) {
  const { t } = useTranslation();
  const { leadSources, ecommercePlatforms, itIntegrations, updateDeal, currentUser, users } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [appAlert, setAppAlert] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showCloserAttributes = ['closer', 'farmer', 'cso', 'administrator'].includes(currentUser?.role || '');
  const showFarmingAttributes = ['closer', 'farmer', 'cso', 'administrator'].includes(currentUser?.role || '');

  const subordinateIds = getSubordinateIds(users, currentUser?.id || '');
  const isVedouci = Boolean(deal.hunterId && subordinateIds.includes(deal.hunterId)) ||
                    Boolean(deal.closerId && subordinateIds.includes(deal.closerId)) ||
                    Boolean(deal.farmerId && subordinateIds.includes(deal.farmerId));
  const canDeleteOffer = currentUser?.role === 'administrator' || 
                         currentUser?.role === 'cso' || 
                         isVedouci;

  const [offerToDelete, setOfferToDelete] = useState<PricingOffer | null>(null);

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      if (offerToDelete.url) {
        const token = localStorage.getItem('jwt_token');
        const res = await fetch(`/api/upload?url=${encodeURIComponent(offerToDelete.url)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const deleteData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(deleteData.error || 'Delete failed');
      }
      
      const newOffers = deal.pricingOffers?.filter(o => o.id !== offerToDelete.id) || [];
      await updateDeal(deal.id, { pricingOffers: newOffers }, currentUser!.id);
      
    } catch (err: any) {
      console.error('Delete offer err:', err);
      setAppAlert({
        isOpen: true,
        title: t('common.error', 'Chyba'),
        message: err.message || t('common.errorDesc', 'Něco se pokazilo.')
      });
    } finally {
      setOfferToDelete(null);
    }
  };

  const handleDeleteOffer = (offer: PricingOffer) => {
    setOfferToDelete(offer);
  };

  const [formData, setFormData] = useState<Partial<Deal>>({
    leadSourceId: deal.leadSourceId,
    ecommercePlatformId: deal.ecommercePlatformId,
    deliveryCountries: deal.deliveryCountries || [],
    averageItemsPerOrder: deal.averageItemsPerOrder,
    averageParcelWeight: deal.averageParcelWeight,
    averageParcelVolume: deal.averageParcelVolume,
    contractSignedDate: deal.contractSignedDate,
    pricingUploadedDate: deal.pricingUploadedDate,
    itIntegrationId: deal.itIntegrationId,
    firstStockingDate: deal.firstStockingDate
  });
  
  const [parcelsStr, setParcelsStr] = useState<string>(deal.estimatedMonthlyParcels?.toString() || '');
  const [parcelsError, setParcelsError] = useState<boolean>(false);
  
  const [itemsStr, setItemsStr] = useState<string>(deal.averageItemsPerOrder?.toString() || '');
  const [weightStr, setWeightStr] = useState<string>(deal.averageParcelWeight?.toString() || '');
  const [volumeStr, setVolumeStr] = useState<string>(deal.averageParcelVolume?.toString() || '');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleEdit = () => {
    setFormData({
      leadSourceId: deal.leadSourceId,
      ecommercePlatformId: deal.ecommercePlatformId,
      deliveryCountries: deal.deliveryCountries || [],
      averageItemsPerOrder: deal.averageItemsPerOrder,
      averageParcelWeight: deal.averageParcelWeight,
      averageParcelVolume: deal.averageParcelVolume,
      contractSignedDate: deal.contractSignedDate,
      pricingUploadedDate: deal.pricingUploadedDate,
      itIntegrationId: deal.itIntegrationId,
      firstStockingDate: deal.firstStockingDate
    });
    setParcelsStr(deal.estimatedMonthlyParcels?.toString() || '');
    setParcelsError(false);
    
    setItemsStr(deal.averageItemsPerOrder?.toString() || '');
    setWeightStr(deal.averageParcelWeight?.toString() || '');
    setVolumeStr(deal.averageParcelVolume?.toString() || '');
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const validateDecimal = (val: string, field: string, allowDecimal = true) => {
    if (!val) {
      setErrors(prev => ({ ...prev, [field]: false }));
      return true;
    }
    const num = Number(val);
    const valid = !isNaN(num) && num > 0 && (allowDecimal || Number.isInteger(num));
    setErrors(prev => ({ ...prev, [field]: !valid }));
    return valid;
  };

  const willAdvanceToDiscovery = deal.stage === 'lead_opportunity' &&
    deal.hunterId &&
    formData.leadSourceId &&
    formData.ecommercePlatformId &&
    parcelsStr &&
    !parcelsError &&
    Number(parcelsStr) > 0;
    
  // Check conditions including the form state
  const willAdvanceToContracting = deal.stage === 'discovery_proposal' &&
    deal.closerId &&
    formData.deliveryCountries && formData.deliveryCountries.length > 0 &&
    itemsStr && !errors.items && Number(itemsStr) > 0 &&
    weightStr && !errors.weight && Number(weightStr) > 0 &&
    volumeStr && !errors.volume && Number(volumeStr) > 0 &&
    deal.pricingOffers && deal.pricingOffers.length > 0;

  const willAdvanceToOnboarding = deal.stage === 'contracting' &&
    deal.closerId &&
    formData.contractSignedDate &&
    formData.pricingUploadedDate &&
    formData.itIntegrationId &&
    formData.firstStockingDate;

  const handleSave = () => {
    if (!currentUser) return;
    
    if (parcelsStr) {
      const num = Number(parcelsStr);
      if (!Number.isInteger(num) || num <= 0) {
        setParcelsError(true);
        return;
      }
    }
    
    const validItems = validateDecimal(itemsStr, 'items');
    const validWeight = validateDecimal(weightStr, 'weight');
    const validVolume = validateDecimal(volumeStr, 'volume', false);

    if (!validItems || !validWeight || !validVolume) return;

    let nextStage = deal.stage;
    if (willAdvanceToDiscovery) {
      nextStage = 'discovery_proposal';
    } else if (willAdvanceToContracting) {
      nextStage = 'contracting';
    } else if (willAdvanceToOnboarding) {
      nextStage = 'onboarding';
      setAppAlert({
        isOpen: true,
        title: t('common.success', 'Úspěch'),
        message: 'Příležitost byla automaticky posunuta do fáze Onboarding.'
      });
    }

    updateDeal(deal.id, {
      ...formData,
      estimatedMonthlyParcels: parcelsStr ? Number(parcelsStr) : undefined,
      averageItemsPerOrder: itemsStr ? Number(itemsStr) : undefined,
      averageParcelWeight: weightStr ? Number(weightStr) : undefined,
      averageParcelVolume: volumeStr ? Number(volumeStr) : undefined,
      stage: nextStage
    }, currentUser.id);

    setIsEditing(false);
  };

  const handleCountryToggle = (country: string) => {
    const current = formData.deliveryCountries || [];
    if (current.includes(country)) {
      setFormData({ ...formData, deliveryCountries: current.filter(c => c !== country) });
    } else {
      setFormData({ ...formData, deliveryCountries: [...current, country] });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    const { companies } = useStore.getState();
    const company = companies.find((c: any) => c.id === deal.companyId);
    const ico = company?.companyId || 'unknown_ico';
    
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const documentPrefix = `offer_${(deal.pricingOffers?.length || 0) + 1}`;
    
    const formDataBody = new FormData();
    formDataBody.append('ico', ico);
    formDataBody.append('documentPrefix', documentPrefix);
    formDataBody.append('file', file);

    try {
      const token = localStorage.getItem('jwt_token');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataBody
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
      
      const newOffer: PricingOffer = {
        id: uuidv4(),
        filename: `${documentPrefix}${ext}`,
        dateSent: new Date().toISOString(),
        createdBy: currentUser.id,
        url: uploadData.fileUrl
      };

      let nextStage = deal.stage;
      const canAdvance = deal.stage === 'discovery_proposal' &&
        deal.closerId &&
        deal.deliveryCountries && deal.deliveryCountries.length > 0 &&
        deal.averageItemsPerOrder && deal.averageItemsPerOrder > 0 &&
        deal.averageParcelWeight && deal.averageParcelWeight > 0 &&
        deal.averageParcelVolume && deal.averageParcelVolume > 0;

      if (canAdvance) {
        nextStage = 'contracting';
        setAppAlert({
          isOpen: true,
          title: t('common.success', 'Úspěch'),
          message: t('common.advancingToContracting', 'Příležitost byla automaticky posunuta do fáze Contracting.')
        });
      }

      await updateDeal(deal.id, {
        pricingOffers: [...(deal.pricingOffers || []), newOffer],
        stage: nextStage
      }, currentUser.id);
    } catch (err: any) {
      console.error('File upload err:', err);
      setAppAlert({
        isOpen: true,
        title: t('common.error', 'Chyba'),
        message: err.message || t('common.errorDesc', 'Něco se pokazilo.')
      });
    }
  };

  const lsName = leadSources.find(s => s.id === deal.leadSourceId)?.name || '-';
  const ecName = ecommercePlatforms.find(s => s.id === deal.ecommercePlatformId)?.name || '-';

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('deal.attributes.title')}</h3>
        {canEdit && !isEditing && (
          <button onClick={handleEdit} className="text-sm text-indigo-600 font-medium hover:text-indigo-800">
            {t('common.edit')}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 text-sm mt-3">
          {(willAdvanceToDiscovery || willAdvanceToContracting || willAdvanceToOnboarding) && (
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Uložením těchto hodnot dojde k automatickému posunu příležitosti do fáze <strong>{willAdvanceToDiscovery ? t('stages.discovery_proposal') : willAdvanceToContracting ? t('stages.contracting', 'Contracting') : t('stages.onboarding', 'Onboarding')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-gray-500 mb-1">{t('deal.attributes.leadSource')} *</label>
            <select 
              value={formData.leadSourceId || ''} 
              onChange={e => setFormData({ ...formData, leadSourceId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">{t('deal.attributes.notSelected')}</option>
              {leadSources.filter(ls => ls.isActive !== false || ls.id === deal.leadSourceId).map(ls => (
                <option key={ls.id} value={ls.id}>{ls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-500 mb-1">{t('deal.attributes.ecommercePlatform')} *</label>
            <select 
              value={formData.ecommercePlatformId || ''} 
              onChange={e => setFormData({ ...formData, ecommercePlatformId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">{t('deal.attributes.notSelected')}</option>
              {ecommercePlatforms.filter(ec => ec.isActive !== false || ec.id === deal.ecommercePlatformId).map(ec => (
                <option key={ec.id} value={ec.id}>{ec.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-500 mb-1">{t('deal.attributes.estimatedParcels')} *</label>
            <input 
              type="text"
              value={parcelsStr} 
              onChange={e => {
                const val = e.target.value;
                setParcelsStr(val);
                if (val && (!Number.isInteger(Number(val)) || Number(val) <= 0)) {
                  setParcelsError(true);
                } else {
                  setParcelsError(false);
                }
              }}
              className={'w-full px-3 py-2 border rounded outline-none transition-colors ' + (parcelsError ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600' : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500')}
            />
            {parcelsError && (
              <p className="mt-1 text-xs text-red-600">{t('deal.attributes.enterValidInteger')}</p>
            )}
          </div>
          
          {showCloserAttributes && (
            <>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.deliveryCountries')}</label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 grid grid-cols-2 gap-2 text-sm bg-white">
                  {PHONE_PREFIXES.filter(p => p.country !== 'Other').map(p => (
                    <label key={p.country} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={(formData.deliveryCountries || []).includes(p.country)}
                        onChange={() => handleCountryToggle(p.country)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{p.flag} {p.country}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.averageItems')}</label>
                <input 
                  type="text"
                  value={itemsStr} 
                  onChange={e => {
                    const val = e.target.value;
                    setItemsStr(val);
                    validateDecimal(val, 'items');
                  }}
                  className={'w-full px-3 py-2 border rounded outline-none transition-colors ' + (errors.items ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600' : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500')}
                />
                {errors.items && <p className="mt-1 text-xs text-red-600">{t('deal.attributes.enterValidInteger')}</p>}
              </div>

              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.averageWeight')}</label>
                <input 
                  type="text"
                  value={weightStr} 
                  onChange={e => {
                    const val = e.target.value;
                    setWeightStr(val);
                    validateDecimal(val, 'weight');
                  }}
                  className={'w-full px-3 py-2 border rounded outline-none transition-colors ' + (errors.weight ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600' : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500')}
                />
                {errors.weight && <p className="mt-1 text-xs text-red-600">{t('deal.attributes.enterValidInteger')}</p>}
              </div>

              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.averageVolume')}</label>
                <input 
                  type="text"
                  value={volumeStr} 
                  onChange={e => {
                    const val = e.target.value;
                    setVolumeStr(val);
                    validateDecimal(val, 'volume', false);
                  }}
                  className={'w-full px-3 py-2 border rounded outline-none transition-colors ' + (errors.volume ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-600' : 'border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500')}
                />
                {errors.volume && <p className="mt-1 text-xs text-red-600">{t('deal.attributes.enterValidInteger')}</p>}
              </div>
            </>
          )}

          {showFarmingAttributes && (
            <>
              <div>
                <label className="block text-gray-500 mb-1">Datum podepsání smlouvy</label>
                <input 
                  type="date"
                  value={formData.contractSignedDate ? formData.contractSignedDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, contractSignedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Datum nahrání ceníku do systému</label>
                <input 
                  type="date"
                  value={formData.pricingUploadedDate ? formData.pricingUploadedDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, pricingUploadedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Požadavek na IT integraci</label>
                <select
                  value={formData.itIntegrationId || ''}
                  onChange={e => setFormData({ ...formData, itIntegrationId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="">Nevybráno</option>
                  {itIntegrations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Datum 1. naskladnění</label>
                <input 
                  type="date"
                  value={formData.firstStockingDate ? formData.firstStockingDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, firstStockingDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={handleCancel} className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">{t('common.cancel')}</button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700">{t('common.save')}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm mt-3">
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.leadSource')}</span>
            <span className="text-gray-900 font-medium">{lsName}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.ecommercePlatform')}</span>
            <span className="text-gray-900 font-medium">{ecName}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.estimatedParcels')}</span>
            <span className="text-gray-900 font-medium">{deal.estimatedMonthlyParcels || '-'}</span>
          </div>
          
          {showCloserAttributes && (
            <>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.deliveryCountries')}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {deal.deliveryCountries?.length ? deal.deliveryCountries.map(c => {
                    const p = PHONE_PREFIXES.find(prefix => prefix.country === c);
                    return (
                      <span key={c} className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded border border-gray-200">
                        {p?.flag} {c}
                      </span>
                    );
                  }) : <span className="text-gray-900 font-medium">-</span>}
                </div>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.averageItems')}</span>
                <span className="text-gray-900 font-medium">{deal.averageItemsPerOrder || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.averageWeight')}</span>
                <span className="text-gray-900 font-medium">{deal.averageParcelWeight || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.averageVolume')}</span>
                <span className="text-gray-900 font-medium">{deal.averageParcelVolume || '-'}</span>
              </div>
            </>
          )}

          {showFarmingAttributes && (
            <>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Datum podepsání smlouvy</span>
                <span className="text-gray-900 font-medium">{deal.contractSignedDate ? format(parseISO(deal.contractSignedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Datum nahrání ceníku do systému</span>
                <span className="text-gray-900 font-medium">{deal.pricingUploadedDate ? format(parseISO(deal.pricingUploadedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Požadavek na IT integraci</span>
                <span className="text-gray-900 font-medium">{itIntegrations.find(i => i.id === deal.itIntegrationId)?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Datum 1. naskladnění</span>
                <span className="text-gray-900 font-medium">{deal.firstStockingDate ? format(parseISO(deal.firstStockingDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
            </>
          )}
        </div>
      )}

      {showCloserAttributes && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">{t('deal.attributes.pricingOffers')}</span>
            {canEdit && (
              <div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 font-medium flex items-center gap-1 shadow-sm"
                >
                  <Upload className="w-3 h-3" /> {t('deal.attributes.addOffer')}
                </button>
              </div>
            )}
          </div>
          
          {deal.pricingOffers && deal.pricingOffers.length > 0 ? (
            <div className="space-y-2">
              {deal.pricingOffers.slice().reverse().map(offer => {
                const u = users.find(user => user.id === offer.createdBy);
                return (
                  <div key={offer.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{offer.filename}</p>
                        <p className="text-[10px] text-gray-500">
                          {format(parseISO(offer.dateSent), 'MMM d, yyyy HH:mm')} • {t('deal.attributes.addedBy')} {u?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={offer.url?.replace(/^\/uploads\//, '/api/uploads/')} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">{t('deal.attributes.download')}</a>
                      {canDeleteOffer && (
                        <button 
                          onClick={() => handleDeleteOffer(offer)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title={t('common.delete', 'Smazat')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t('deal.attributes.noOffers')}</p>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={offerToDelete !== null}
        onClose={() => setOfferToDelete(null)}
        onConfirm={confirmDeleteOffer}
        title={t('common.delete', 'Smazat')}
        message={t('deal.attributes.deleteOfferConfirm', 'Opravdu chcete smazat tento soubor?')}
      />

      <AlertModal
        isOpen={appAlert.isOpen}
        onClose={() => setAppAlert({ ...appAlert, isOpen: false })}
        title={appAlert.title}
        message={appAlert.message}
      />
    </div>
  );
}

function ContactsManager({ company, canEdit }: { company: Company, canEdit: boolean }) {
  const { id: companyId, contacts } = company;
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { updateCompany, currentUser, users, companies } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showAllContacts, setShowAllContacts] = useState(false);

  const [appAlert, setAppAlert] = useState<{ isOpen: boolean, title: string, message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredContacts = contacts.filter(c => showAllContacts || c.isActive !== false);
  const reversedContacts = [...filteredContacts].reverse();
  const visibleContacts = isExpanded ? reversedContacts : reversedContacts.slice(0, 3);
  const hasMoreContacts = reversedContacts.length > 3;

  const handleSaveContact = () => {
    setSubmitAttempted(true);
    setEmailError(null);
    
    if (!newContact.name || !newContact.position || (!newContact.email && !newContact.phone)) {
      return;
    }

    if (newContact.email) {
      const emailExists = companies.some(c => 
        c.contacts.some(contact => 
          contact.email.toLowerCase() === newContact.email?.toLowerCase() && 
          contact.id !== editingId
        )
      );

      if (emailExists) {
        setEmailError(t('errors.contactEmailExists'));
        return;
      }
    }
    
    if (!currentUser) return;
    
    if (editingId) {
      const updatedContacts = contacts.map(c => 
        c.id === editingId ? { ...c, ...newContact } as Contact : c
      );
      updateCompany(companyId, { contacts: updatedContacts }, currentUser.id);
      setEditingId(null);
    } else {
      const contact: Contact = {
        id: uuidv4(),
        name: newContact.name || '',
        position: newContact.position || '',
        email: newContact.email || '',
        phone: newContact.phone || '',
        phonePrefix: newContact.phonePrefix || getDefaultPhonePrefixForCountry(company.country || ''),
        photoUrl: newContact.photoUrl,
        photoWebpUrl: newContact.photoWebpUrl,
        isActive: newContact.isActive ?? true
      };

      updateCompany(companyId, { contacts: [...contacts, contact] }, currentUser.id);
      setIsAdding(false);
    }
    
    setNewContact({});
    setSubmitAttempted(false);
  };

  const handleEditClick = (contact: Contact) => {
    setEditingId(contact.id);
    setNewContact({ ...contact });
    setIsAdding(false);
    setSubmitAttempted(false);
  };

  const handleToggleActive = (contact: Contact) => {
    if (!currentUser) return;
    const updatedContacts = contacts.map(c => 
      c.id === contact.id ? { ...c, isActive: c.isActive === false ? true : false } : c
    );
    updateCompany(companyId, { contacts: updatedContacts }, currentUser.id);
  };

  const [dncContactId, setDncContactId] = useState<string | null>(null);
  const [dncReason, setDncReason] = useState('');

  const handleToggleDnc = (contact: Contact, reason?: string) => {
    if (!currentUser) return;
    const isNowDnc = !contact.doNotContact;
    const updatedContacts = contacts.map(c => 
      c.id === contact.id ? { 
        ...c, 
        doNotContact: isNowDnc,
        doNotContactReason: isNowDnc ? reason : undefined,
        doNotContactTimestamp: isNowDnc ? new Date().toISOString() : undefined,
        doNotContactBy: isNowDnc ? currentUser.id : undefined 
      } : c
    );
    updateCompany(companyId, { contacts: updatedContacts }, currentUser.id);
    setDncContactId(null);
    setDncReason('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        let { width, height } = img;
        const maxSize = 800;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * maxSize / width);
            width = maxSize;
          } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const ico = company.companyId || 'unknown_ico';
          const safeName = (newContact.name || 'new').replace(/[^a-zA-Z0-9]/g, '');
          const prefix = `contact_${safeName}`;
          let ext = file.name.substring(file.name.lastIndexOf('.'));
          if (!ext || ext.length > 5) ext = '.png';
          
          const fd = new FormData();
          fd.append('ico', ico);
          fd.append('documentPrefix', prefix);
          fd.append('file', blob, `${prefix}${ext}`);
          
          try {
            const token = localStorage.getItem('jwt_token');
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: fd
            });
            const dat = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(dat.error || 'Upload failed');
            
            setNewContact(prev => ({
              ...prev,
              photoUrl: dat.fileUrl,
              photoWebpUrl: dat.fileUrl
            }));
          } catch(err: any) {
            console.error('Image upload err:', err);
            setAppAlert({
              isOpen: true,
              title: t('common.error', 'Chyba'),
              message: err.message || t('common.errorDesc', 'Něco se pokazilo.')
            });
          }
        }, file.type || 'image/png', 0.8);
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{t('common.contacts')}</h3>
          <button 
            onClick={() => setShowAllContacts(!showAllContacts)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
          >
            {showAllContacts ? t('common.activeOnly') : t('common.showAll')}
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {visibleContacts.map(contact => (
        <div key={contact.id}>
          {editingId === contact.id ? (
            <ContactForm 
              contact={newContact}
              setContact={setNewContact}
              onSave={handleSaveContact}
              onCancel={() => {
                setEditingId(null);
                setNewContact({});
              }}
              submitAttempted={submitAttempted}
              fileInputRef={fileInputRef}
              handleImageUpload={handleImageUpload}
              t={t}
              isEditing={true}
              defaultPrefix={getDefaultPhonePrefixForCountry(company.country || '')}
              emailError={emailError}
            />
          ) : (
            <div className={`group flex gap-4 p-4 border border-gray-200 rounded-lg ${contact.isActive === false ? 'bg-gray-100 opacity-60' : 'bg-gray-50/50'}`}>
              <div className="flex-shrink-0">
                {contact.photoWebpUrl ? (
                  <a href={contact.photoUrl?.replace(/^\/uploads\//, '/api/uploads/')} target="_blank" rel="noreferrer" title="Click to view full image">
                    <img src={contact.photoWebpUrl?.replace(/^\/uploads\//, '/api/uploads/')} alt={contact.name} className="w-16 h-16 rounded-full object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                  </a>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-xl font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    {contact.isActive === false && <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Inactive</span>}
                    {contact.doNotContact && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded" title={`Reason: ${contact.doNotContactReason || 'No reason provided'}\nBy: ${users.find(u => u.id === contact.doNotContactBy)?.name || 'Unknown'}\nOn: ${contact.doNotContactTimestamp ? format(parseISO(contact.doNotContactTimestamp), 'MMM d, yyyy') : 'Unknown'}`}>Do Not Contact</span>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      {dncContactId === contact.id ? (
                        <div className="flex items-center gap-2 bg-white p-1 rounded shadow-sm border border-gray-200">
                          <input 
                            placeholder="Reason for not contacting..."
                            value={dncReason}
                            onChange={(e) => setDncReason(e.target.value)}
                            className="text-xs px-2 py-1 outline-none w-48 border-none"
                            autoFocus
                          />
                          <button onClick={() => handleToggleDnc(contact, dncReason)} className="text-xs bg-red-600 text-white px-2 py-1 rounded font-medium hover:bg-red-700">Save</button>
                          <button onClick={() => { setDncContactId(null); setDncReason(''); }} className="text-xs text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(contact)} className="text-xs text-indigo-600 font-medium hover:underline">{t('common.edit')}</button>
                          <button onClick={() => handleToggleActive(contact)} className="text-xs text-gray-500 font-medium hover:underline">
                            {contact.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                          <button onClick={() => contact.doNotContact ? handleToggleDnc(contact) : setDncContactId(contact.id)} className={`text-xs ${contact.doNotContact ? 'text-gray-500' : 'text-red-600'} font-medium hover:underline`}>
                            {contact.doNotContact ? 'Remove DNC' : 'Mark DNC'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">{contact.position}</p>
                <div className="mt-2 text-sm text-gray-600 flex flex-col gap-1">
                  {contact.email && (
                    <div className="flex items-center gap-2 relative w-fit">
                      {contact.doNotContact && <Ban className="absolute -left-1 text-red-500/80 w-5 h-5 z-10" />}
                      <Mail className={`w-4 h-4 ${contact.doNotContact ? 'text-gray-300' : 'text-gray-400'}`} />
                      <span className={contact.doNotContact ? 'text-gray-400 line-through' : ''}>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 relative w-fit">
                      {contact.doNotContact && <Ban className="absolute -left-1 text-red-500/80 w-5 h-5 z-10" />}
                      <Phone className={`w-4 h-4 ${contact.doNotContact ? 'text-gray-300' : 'text-gray-400'}`} />
                      <span className={contact.doNotContact ? 'text-gray-400 line-through' : ''}>
                        {contact.phonePrefix ? `${contact.phonePrefix} ` : ''}{contact.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {hasMoreContacts && (
        <div className="flex justify-center mt-2 border-t border-gray-100 pt-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            title={isExpanded ? "Show fewer contacts" : "Show all contacts"}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      )}

      {canEdit && !isAdding && !editingId && (
        <button 
          onClick={() => {
            setIsAdding(true);
            setNewContact({ isActive: true });
            setSubmitAttempted(false);
          }}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('common.addContact')}
        </button>
      )}

      {isAdding && (
        <ContactForm 
          contact={newContact}
          setContact={setNewContact}
          onSave={handleSaveContact}
          onCancel={() => {
            setIsAdding(false);
            setNewContact({});
          }}
          submitAttempted={submitAttempted}
          fileInputRef={fileInputRef}
          handleImageUpload={handleImageUpload}
          t={t}
          isEditing={false}
          defaultPrefix={getDefaultPhonePrefixForCountry(company.country || '')}
          emailError={emailError}
        />
      )}
    </div>

    <AlertModal
      isOpen={appAlert.isOpen}
      onClose={() => setAppAlert({ ...appAlert, isOpen: false })}
      title={appAlert.title}
      message={appAlert.message}
    />
    </div>
  );
}

function ContactForm({ 
  contact, 
  setContact, 
  onSave, 
  onCancel, 
  submitAttempted, 
  fileInputRef, 
  handleImageUpload, 
  t,
  isEditing,
  defaultPrefix,
  emailError
}: any) {
  const missingEmailPhone = submitAttempted && !contact.email && !contact.phone;

  // Initialize phonePrefix if needed
  React.useEffect(() => {
    if (!contact.phonePrefix && defaultPrefix) {
      setContact((prev: any) => ({ ...prev, phonePrefix: defaultPrefix }));
    }
  }, []);

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-4">
      <h4 className="font-medium text-gray-900">{isEditing ? t('common.editContact') : t('common.newContact')}</h4>
      
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div 
            className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors bg-cover bg-center"
            style={contact.photoWebpUrl ? { backgroundImage: `url(${contact.photoWebpUrl.replace(/^\/uploads\//, '/api/uploads/')})`, borderStyle: 'solid' } : {}}
            onClick={() => fileInputRef.current?.click()}
          >
            {!contact.photoWebpUrl && <Upload className="w-5 h-5 text-gray-400" />}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </div>
        <div className="text-xs text-gray-500">
          Click to upload photo (will be converted to WebP)
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input 
              value={contact.name || ''} 
              onChange={e => setContact({...contact, name: e.target.value})} 
              className={`w-full px-3 py-2 border ${submitAttempted && !contact.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
            />
            {submitAttempted && !contact.name && <p className="mt-1 text-xs text-red-600">{t('errors.requiredField')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Position *</label>
            <input 
              value={contact.position || ''} 
              onChange={e => setContact({...contact, position: e.target.value})} 
              className={`w-full px-3 py-2 border ${submitAttempted && !contact.position ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
            />
            {submitAttempted && !contact.position && <p className="mt-1 text-xs text-red-600">{t('errors.requiredField')}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input 
            value={contact.email || ''} 
            onChange={e => setContact({...contact, email: e.target.value})} 
            className={`w-full px-3 py-2 border ${(missingEmailPhone || emailError) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
          />
          {missingEmailPhone && <p className="mt-1 text-xs text-red-600">{t('errors.emailOrPhoneRequired')}</p>}
          {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <div className="flex gap-2">
            <select 
              value={contact.phonePrefix || defaultPrefix || ''} 
              onChange={e => setContact({...contact, phonePrefix: e.target.value})} 
              className="min-w-[140px] px-2 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">--</option>
              {PHONE_PREFIXES.map(p => (
                <option key={`${p.country}-${p.code}`} value={p.code}>
                  {p.flag} {p.code}
                </option>
              ))}
            </select>
            <input 
              value={contact.phone || ''} 
              onChange={e => setContact({...contact, phone: e.target.value})} 
              className={`flex-1 px-3 py-2 border ${missingEmailPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50">Cancel</button>
        <button onClick={onSave} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700">Save</button>
      </div>
    </div>
  );
}

function DealActionsManager({ deal, canEdit }: { deal: Deal, canEdit: boolean }) {
  const { updateDeal, currentUser, users } = useStore();
  const [showPostpone, setShowPostpone] = useState(false);
  const [showLost, setShowLost] = useState(false);
  
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  
  const [lostReason, setLostReason] = useState('');

  if (!currentUser) return null;

  const handlePostpone = () => {
    if (!postponeDate || !postponeReason) return;
    updateDeal(deal.id, {
      stage: 'lost',
      postponedUntil: postponeDate,
      postponedReason: postponeReason,
      postponedBy: currentUser.id,
      postponedAt: new Date().toISOString()
    }, currentUser.id);
    setShowPostpone(false);
  };

  const handleCancelPostpone = () => {
    updateDeal(deal.id, {
      stage: 'lead_opportunity',
      postponedUntil: undefined,
      postponedReason: undefined,
      postponedBy: undefined,
      postponedAt: undefined
    }, currentUser.id);
  };

  const handleLost = () => {
    if (!lostReason) return;
    updateDeal(deal.id, {
      stage: 'lost',
      lostPermanently: true,
      lostReason: lostReason,
      lostBy: currentUser.id,
      lostAt: new Date().toISOString(),
      postponedUntil: undefined,
      postponedReason: undefined,
      postponedBy: undefined,
      postponedAt: undefined
    }, currentUser.id);
    setShowLost(false);
  };

  const handleCancelLost = () => {
    updateDeal(deal.id, {
      stage: 'lead_opportunity',
      lostPermanently: false,
      lostReason: undefined,
      lostBy: undefined,
      lostAt: undefined
    }, currentUser.id);
  };

  const maxPostponeDate = format(addMonths(new Date(), 6), 'yyyy-MM-dd');
  const minPostponeDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      {deal.postponedUntil ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-500 mt-0.5 shadow-sm" />
              <div>
                <h4 className="font-medium text-orange-900">Postponed until {format(parseISO(deal.postponedUntil), 'MMM d, yyyy')}</h4>
                <p className="text-sm text-orange-700 mt-1 bg-white/50 p-2 rounded -mx-2">{deal.postponedReason}</p>
                <p className="text-xs text-orange-600 mt-2">
                  Postponed by {users.find(u => u.id === deal.postponedBy)?.name} on {deal.postponedAt && format(parseISO(deal.postponedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            {canEdit && (
              <button 
                onClick={handleCancelPostpone}
                className="text-xs bg-white text-orange-700 border border-orange-300 px-3 py-1.5 rounded hover:bg-orange-100 font-medium transition shadow-sm whitespace-nowrap ml-4"
              >
                Reactivate Now
              </button>
            )}
          </div>
        </div>
      ) : deal.lostPermanently ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Ban className="w-5 h-5 text-red-500 mt-0.5 shadow-sm" />
              <div>
                <h4 className="font-medium text-red-900">Do Not Contact (Lost Permanently)</h4>
                <p className="text-sm text-red-700 mt-1 bg-white/50 p-2 rounded -mx-2">{deal.lostReason}</p>
                <p className="text-xs text-red-600 mt-2">
                  Marked by {users.find(u => u.id === deal.lostBy)?.name} on {deal.lostAt && format(parseISO(deal.lostAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            {canEdit && (
              <button 
                onClick={handleCancelLost}
                className="text-xs bg-white text-red-700 border border-red-300 px-3 py-1.5 rounded hover:bg-red-100 font-medium transition shadow-sm whitespace-nowrap ml-4"
              >
                Remove Restriction
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {!showPostpone && !showLost && canEdit && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPostpone(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 flex-1 justify-center transition shadow-sm"
              >
                <Calendar className="w-4 h-4" /> Postpone Deal
              </button>
              <button 
                onClick={() => setShowLost(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded text-sm font-medium text-red-700 hover:bg-red-50 flex-1 justify-center transition shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Lost Permanently
              </button>
            </div>
          )}

          {showPostpone && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
              <h4 className="font-medium text-gray-900">Postpone Deal</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reactivate On *</label>
                <input 
                  type="date" 
                  min={minPostponeDate}
                  max={maxPostponeDate}
                  value={postponeDate}
                  onChange={e => setPostponeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
                <textarea 
                  value={postponeReason}
                  onChange={e => setPostponeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowPostpone(false)} className="px-3 py-1.5 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 rounded">Cancel</button>
                <button onClick={handlePostpone} disabled={!postponeDate || !postponeReason} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded shadow-sm">Save & Postpone</button>
              </div>
            </div>
          )}

          {showLost && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 space-y-3">
              <h4 className="font-medium text-red-900">Mark as Lost Permanently (Do Not Contact)</h4>
              <div>
                <label className="block text-xs font-medium text-red-800 mb-1">Reason *</label>
                <textarea 
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white shadow-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowLost(false)} className="px-3 py-1.5 border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 rounded">Cancel</button>
                <button onClick={handleLost} disabled={!lostReason} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded shadow-sm">Confirm Loss</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivitiesManager({ deal, company, canEdit }: { deal: Deal, company: Company, canEdit: boolean }) {
  const { t } = useTranslation();
  const { activities, addActivity, users, currentUser } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncingEmails, setIsSyncingEmails] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('meeting');
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  const dealActivities = activities
    .filter(a => a.dealId === deal.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSyncEmails = async () => {
    if (!currentUser) return;
    setIsSyncingEmails(true);
    
    try {
      const provider = currentUser.googleIntegration?.connected ? 'google' : 'microsoft';
      // Gather relevant emails (deal owner, contact emails)
      const relevantEmails = [
        ...company.contacts.map(c => c.email),
        company.email
      ].filter(Boolean);

      const res = await apiFetch('/api/sync/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          credentials: provider === 'google' ? currentUser.googleIntegration : currentUser.msIntegration,
          relevantEmails
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Assume backend returns new emails as Array<{ id, subject, body, date, from }>
        if (data.emails && data.emails.length > 0) {
          data.emails.forEach((email: any) => {
            addActivity({
              dealId: deal.id,
              type: 'email',
              date: email.date,
              note: `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.body}`,
              createdBy: currentUser.id,
            });
          });
        }
      }
    } catch (err) {
      console.error('Email sync failed', err);
    } finally {
      setIsSyncingEmails(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !note) return;
    
    let generatedMeetingLink = activityType === 'teams' ? meetingLink : undefined;

    // Call backend to sync if applicable
    if ((activityType === 'teams' || activityType === 'meeting') && (currentUser.msIntegration?.connected || currentUser.googleIntegration?.connected)) {
      try {
        const provider = activityType === 'teams' ? 'microsoft' : (currentUser.googleIntegration?.connected ? 'google' : 'microsoft');
        const res = await apiFetch('/api/sync/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            credentials: provider === 'google' ? currentUser.googleIntegration : currentUser.msIntegration,
            activityDetails: {
              type: activityType,
              date: activityDate,
              note
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.meetingLink && !generatedMeetingLink) {
            generatedMeetingLink = data.meetingLink;
          }
        }
      } catch (err) {
        console.error('Calendar sync failed', err);
      }
    }

    addActivity({
      dealId: deal.id,
      type: activityType,
      date: new Date(activityDate).toISOString(),
      note,
      createdBy: currentUser.id,
      meetingLink: generatedMeetingLink,
    });
    
    setIsAdding(false);
    setNote('');
    setMeetingLink('');
    setActivityType('meeting');
    setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  };

  const getActivityIcon = (type: ActivityType) => {
    switch(type) {
      case 'meeting': return <UserIcon className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'teams': return <Video className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch(type) {
      case 'meeting': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'call': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'teams': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'email': return 'bg-orange-100 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch(type) {
      case 'meeting': return 'In-person Meeting';
      case 'call': return 'Phone Call';
      case 'teams': return 'Teams Call';
      case 'email': return 'Email';
      default: return 'Activity';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />{t('common.activities')}</h3>
        <div className="flex gap-3">
          {(currentUser?.googleIntegration?.connected || currentUser?.msIntegration?.connected) && canEdit && (
            <button 
              type="button"
              onClick={handleSyncEmails}
              disabled={isSyncingEmails}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingEmails ? 'animate-spin' : ''}`} />
              Sync Emails
            </button>
          )}
          {canEdit && !isAdding && (
            <button 
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Activity
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <h4 className="font-medium text-gray-900">New Activity</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Activity Type</label>
              <select 
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="meeting">In-person Meeting</option>
                <option value="call">Phone Call</option>
                <option value="teams">Teams Call</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time</label>
              <input 
                type="datetime-local"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            {activityType === 'teams' && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Link (optional)</label>
                <input 
                  type="url"
                  placeholder="https://teams.microsoft.com/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Description *</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was discussed?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[100px]"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={!note} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">Save Activity</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dealActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            No activities recorded yet.
          </div>
        ) : (
          dealActivities.map(activity => {
            const user = users.find(u => u.id === activity.createdBy);
            return (
              <div key={activity.id} className="bg-white border text-gray-800 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="absolute top-4 right-4 text-xs text-gray-400">
                  {format(parseISO(activity.createdAt), 'MMM d, yyyy HH:mm')}
                </div>
                
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg border flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-24">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{getActivityLabel(activity.type)}</span>
                      <span className="text-xs text-gray-500">
                        planned on <span className="font-medium text-gray-700">{format(parseISO(activity.date), 'MMM d, yyyy HH:mm')}</span>
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 bg-gray-50 border border-gray-100 p-3 rounded-lg leading-relaxed">
                      {activity.note}
                    </p>
                    
                    {activity.type === 'teams' && activity.meetingLink && (
                      <div className="mt-3">
                        <a href={activity.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-200">
                          <Video className="w-3.5 h-3.5" />
                          Join Teams Meeting
                        </a>
                      </div>
                    )}
                    
                    {activity.transcript && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
                        <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Copilot Transcript
                        </div>
                        <div className="whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {activity.transcript}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
                      <UserIcon className="w-3.5 h-3.5" />
                      Recorded by <span className="font-medium">{user?.name || 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
