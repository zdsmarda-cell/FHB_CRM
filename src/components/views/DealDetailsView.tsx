import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore, apiFetch } from '../../store';
import { ArrowLeft, Clock, User as UserIcon, Plus, X, Upload, Mail, Phone, Ban, Calendar, AlertTriangle, Video, MessageSquare, RefreshCw, ChevronDown, ChevronUp, Trash2, Edit2, Check } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { Contact, Company, Region, Segment, Deal, Activity, ActivityType, PricingOffer, DealDocument } from '../../types';
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
  const { deals, companies, auditLogs, users, currentUser, updateCompany, updateDeal, segments } = store;

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
  const [activeRightTab, setActiveRightTab] = useState<'activities' | 'documents' | 'history' | 'notes'>('activities');
  const historyPerPage = 5;

  const [dealFormData, setDealFormData] = useState<Partial<Deal>>({});

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
    setDealFormData({ hunterId: deal.hunterId, closerId: deal.closerId, farmerId: deal.farmerId });
    setIsEditing(true);
  };

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaveError('');
    try {
      if (formData.urls) {
         formData.urls = formData.urls.filter(u => u.trim() !== '');
      }
      await updateCompany(company.id, formData, currentUser.id);
      await updateDeal(deal.id, dealFormData, currentUser.id);
      setIsEditing(false);
    } catch (err: any) {
      if (err.message === 'icoExists') {
        setSaveError(t('errors.icoExists'));
      } else if (err.message === 'urlExists') {
        setSaveError(t('errors.urlExists', 'A company with this URL already exists.'));
      } else {
        setSaveError(err.message || t('errors.generalError'));
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
    setDealFormData({});
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
            {!isEditing ? (
              [
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
              })
            ) : (
              <div className="flex gap-4">
                {[
                  { role: 'Hunter', field: 'hunterId' as keyof Deal },
                  { role: 'Closer', field: 'closerId' as keyof Deal },
                  { role: 'Farmer', field: 'farmerId' as keyof Deal }
                ].map(({ role, field }) => (
                  <div key={role} className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{role}</label>
                    <select
                      value={(dealFormData[field] as string) || ''}
                      onChange={(e) => setDealFormData({ ...dealFormData, [field]: e.target.value || null })}
                      className="text-sm py-1 pl-2 pr-8 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- {t('common.unassigned', 'Nepřiřazeno')} --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {canEdit && !isEditing && (
          <button onClick={handleEditClick} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
            {t('common.edit')}
          </button>
        )}
        {isEditing && (
          <div className="flex flex-col items-end gap-2">
            {saveError && <p className="text-sm text-red-600 font-medium">{saveError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                {t('common.save')}
              </button>
            </div>
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
            <ContactsManager company={company} canEdit={canEdit} />
          </section>

          <section>
            <DealAttributesForm deal={deal} canEdit={canEdit} />
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
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveRightTab('activities')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeRightTab === 'activities' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t('common.activities')}
            </button>
            <button
              onClick={() => setActiveRightTab('documents')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeRightTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t('common.documents', 'Dokumenty')}
            </button>
            <button
              onClick={() => setActiveRightTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeRightTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t('common.history')}
            </button>
            <button
              onClick={() => setActiveRightTab('notes')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeRightTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t('common.notes', 'Poznámky')}
            </button>
          </div>

          {activeRightTab === 'activities' && (
            <ActivitiesManager deal={deal} company={company} canEdit={canEdit} />
          )}

          {activeRightTab === 'documents' && (
            <DocumentsManager deal={deal} company={company} canEdit={canEdit} />
          )}

          {activeRightTab === 'notes' && (
            <NotesManager deal={deal} company={company} canEdit={canEdit} />
          )}

          {activeRightTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
                      <div className="mt-1 bg-gray-50 p-2 rounded text-xs text-gray-600 border border-gray-200 flex items-center flex-wrap gap-1">
                        {log.oldValue && log.oldValue !== 'undefined' && (
                          <>
                            <span className="line-through opacity-70 break-words">{log.oldValue}</span>
                            <span className="text-gray-400 font-medium">{'->'}</span>
                          </>
                        )}
                        <span className="font-medium text-indigo-700 break-words">{log.newValue}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                        <UserIcon className="w-3 h-3" />
                        {log.changedBy === 'System' ? 'System' : (user?.name || 'Unknown User')}
                      </div>
                    </div>
                  )
                })}
                {logs.length === 0 && <p className="text-sm text-gray-500">{t('deal.attributes.noHistory', 'No history available.')}</p>}
              </div>
              
              {totalHistoryPages > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="text-sm text-indigo-600 font-medium disabled:opacity-50"
                  >
                    {t('common.prev', 'Previous')}
                  </button>
                  <span className="text-xs text-gray-500">{t('common.pageOf', { current: historyPage, total: totalHistoryPages, defaultValue: `Page ${historyPage} of ${totalHistoryPages}` })}</span>
                  <button 
                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage === totalHistoryPages}
                    className="text-sm text-indigo-600 font-medium disabled:opacity-50"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyDetailsForm({ company, isEditing, formData, setFormData }: any) {
  const { t } = useTranslation();
  const { segments } = useStore();

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
            onChange={e => setFormData({ ...formData, segment: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="" disabled>{t('fields.segment')}</option>
            {segments.filter(s => s.isActive || s.id === formData.segment).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
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
        <span className="font-medium text-gray-900 capitalize">{segments.find(s => s.id === company.segment)?.name || company.segment}</span>
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
    firstStockingDate: deal.firstStockingDate,
    itIntegrationCompletedDate: deal.itIntegrationCompletedDate,
    firstStockingDateActual: deal.firstStockingDateActual,
    integrationTestingCompletedDate: deal.integrationTestingCompletedDate
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
      firstStockingDate: deal.firstStockingDate,
      itIntegrationCompletedDate: deal.itIntegrationCompletedDate,
      firstStockingDateActual: deal.firstStockingDateActual,
      integrationTestingCompletedDate: deal.integrationTestingCompletedDate
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

  const willAdvanceToDiscovery = deal.stage === 'lead' &&
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

  const willAdvanceToFarming = deal.stage === 'onboarding' &&
    formData.itIntegrationCompletedDate &&
    formData.firstStockingDateActual &&
    formData.integrationTestingCompletedDate;

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
    } else if (willAdvanceToFarming) {
      nextStage = 'farming';
      setAppAlert({
        isOpen: true,
        title: t('common.success', 'Úspěch'),
        message: 'Příležitost byla automaticky posunuta do fáze Farming.'
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
          {(willAdvanceToDiscovery || willAdvanceToContracting || willAdvanceToOnboarding || willAdvanceToFarming) && (
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Uložením těchto hodnot dojde k automatickému posunu příležitosti do fáze <strong>{willAdvanceToDiscovery ? t('stages.discovery_proposal') : willAdvanceToContracting ? t('stages.contracting', 'Contracting') : willAdvanceToOnboarding ? t('stages.onboarding', 'Onboarding') : t('stages.farming', 'Farming')}</strong>.
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
                <label className="block text-gray-500 mb-1">{t('deal.attributes.contractSignedDate')}</label>
                <input 
                  type="date"
                  value={formData.contractSignedDate ? formData.contractSignedDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, contractSignedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.pricingUploadedDate')}</label>
                <input 
                  type="date"
                  value={formData.pricingUploadedDate ? formData.pricingUploadedDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, pricingUploadedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.itIntegrationRequirement')}</label>
                <select
                  value={formData.itIntegrationId || ''}
                  onChange={e => setFormData({ ...formData, itIntegrationId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="">{t('deal.attributes.notSelected')}</option>
                  {itIntegrations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.expectedFirstStockingDate')}</label>
                <input 
                  type="date"
                  value={formData.firstStockingDate ? formData.firstStockingDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, firstStockingDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.itIntegrationCompletedDate')}</label>
                {currentUser?.role === 'administrator' ? (
                  <input 
                    type="date"
                    value={formData.itIntegrationCompletedDate ? formData.itIntegrationCompletedDate.substring(0,10) : ''} 
                    onChange={e => setFormData({ ...formData, itIntegrationCompletedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-gray-700">
                    {formData.itIntegrationCompletedDate ? format(parseISO(formData.itIntegrationCompletedDate), 'dd.MM.yyyy') : '-'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.integrationTestingCompletedDate')}</label>
                <input 
                  type="date"
                  value={formData.integrationTestingCompletedDate ? formData.integrationTestingCompletedDate.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, integrationTestingCompletedDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('deal.attributes.firstStockingDateActual')}</label>
                <input 
                  type="date"
                  value={formData.firstStockingDateActual ? formData.firstStockingDateActual.substring(0,10) : ''} 
                  onChange={e => setFormData({ ...formData, firstStockingDateActual: e.target.value ? new Date(e.target.value).toISOString() : null })}
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
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.contractSignedDate')}</span>
                <span className="text-gray-900 font-medium">{deal.contractSignedDate ? format(parseISO(deal.contractSignedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.pricingUploadedDate')}</span>
                <span className="text-gray-900 font-medium">{deal.pricingUploadedDate ? format(parseISO(deal.pricingUploadedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.itIntegrationRequirement')}</span>
                <span className="text-gray-900 font-medium">{itIntegrations.find(i => i.id === deal.itIntegrationId)?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.expectedFirstStockingDate')}</span>
                <span className="text-gray-900 font-medium">{deal.firstStockingDate ? format(parseISO(deal.firstStockingDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.itIntegrationCompletedDate')}</span>
                <span className="text-gray-900 font-medium">{deal.itIntegrationCompletedDate ? format(parseISO(deal.itIntegrationCompletedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.integrationTestingCompletedDate')}</span>
                <span className="text-gray-900 font-medium">{deal.integrationTestingCompletedDate ? format(parseISO(deal.integrationTestingCompletedDate), 'dd.MM.yyyy') : '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">{t('deal.attributes.firstStockingDateActual')}</span>
                <span className="text-gray-900 font-medium">{deal.firstStockingDateActual ? format(parseISO(deal.firstStockingDateActual), 'dd.MM.yyyy') : '-'}</span>
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
  const { updateDeal, currentUser, users, lostReasons } = useStore();
  const [showPostpone, setShowPostpone] = useState(false);
  const [showLost, setShowLost] = useState(false);
  
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  
  const [lostReason, setLostReason] = useState('');
  const [lostReasonId, setLostReasonId] = useState('');

  if (!currentUser) return null;

  const handlePostpone = () => {
    if (!postponeDate || !postponeReason) return;
    updateDeal(deal.id, {
      stage: 'lost',
      postponedUntil: postponeDate,
      postponedReason: postponeReason,
      lostFromStage: deal.stage,
      postponedBy: currentUser.id,
      postponedAt: new Date().toISOString()
    }, currentUser.id);
    setShowPostpone(false);
  };

  const handleCancelPostpone = () => {
    updateDeal(deal.id, {
      stage: 'opportunity',
      postponedUntil: undefined,
      postponedReason: undefined,
      postponedBy: undefined,
      postponedAt: undefined
    }, currentUser.id);
  };

  const handleLost = () => {
    if (!lostReasonId) return;
    updateDeal(deal.id, {
      stage: 'lost',
      lostPermanently: true,
      lostReasonId: lostReasonId,
      lostReason: lostReason,
      lostBy: currentUser.id,
      lostAt: new Date().toISOString(),
      lostFromStage: deal.stage,
      postponedUntil: undefined,
      postponedReason: undefined,
      postponedBy: undefined,
      postponedAt: undefined
    }, currentUser.id);
    setShowLost(false);
  };

  const handleCancelLost = () => {
    updateDeal(deal.id, {
      stage: 'opportunity',
      lostPermanently: false,
      lostReasonId: undefined,
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
                <p className="text-sm text-red-800 font-medium mt-1">{lostReasons.find(r => r.id === deal.lostReasonId)?.name || 'Neznámý důvod'}</p>
                {deal.lostReason && <p className="text-sm text-red-700 mt-1 bg-white/50 p-2 rounded -mx-2">{deal.lostReason}</p>}
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
                <label className="block text-xs font-medium text-red-800 mb-1">Důvod ztráty / Reason *</label>
                <select
                  value={lostReasonId}
                  onChange={e => setLostReasonId(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white shadow-sm mb-3"
                >
                  <option value="">Nevybráno</option>
                  {lostReasons.filter(r => r.isActive).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <label className="block text-xs font-medium text-gray-700 mb-1">Poznámka / Note (volitelné)</label>
                <textarea 
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowLost(false)} className="px-3 py-1.5 border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-50 rounded">Cancel</button>
                <button onClick={handleLost} disabled={!lostReasonId} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded shadow-sm">Confirm Loss</button>
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
  const { activities, addActivity, updateActivity, users, currentUser, updateCompany } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isSyncingEmails, setIsSyncingEmails] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('meeting');
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [recordingLink, setRecordingLink] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const [activeTab, setActiveTab] = useState<'history' | 'calendar'>('calendar');
  const [activityFilter, setActivityFilter] = useState<'all' | 'email' | 'meeting'>('all');
  const [activityPage, setActivityPage] = useState(1);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const activitiesPerPage = 10;

  const now = new Date();
  
  const dealActivities = activities
    .filter(a => a.dealId === deal.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const historyActivities = dealActivities
    .filter(a => new Date(a.date || a.createdAt) <= now || a.type === 'email')
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  const futureActivities = dealActivities.filter(a => new Date(a.date || a.createdAt) > now && a.type !== 'email').sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
  
  let displayedActivities = activeTab === 'history' ? historyActivities : futureActivities;

  // Visibility filtering
  displayedActivities = displayedActivities.filter(activity => {
    const isActivityVisible = activity.isVisible === undefined ? true : Boolean(activity.isVisible);
    if (isActivityVisible) return true;
    return currentUser?.role === 'administrator' || currentUser?.role === 'cso';
  });

  // Type filtering
  if (activityFilter === 'email') {
    displayedActivities = displayedActivities.filter(a => a.type === 'email');
  } else if (activityFilter === 'meeting') {
    displayedActivities = displayedActivities.filter(a => a.type === 'teams' || a.type === 'meeting' || a.type === 'call');
  }

  // Deduplicate and filter emails
  const uniqueActivities: typeof displayedActivities = [];
  const seenEmailKeys = new Set();
  
  const isCalendarInvite = (subj: string, note: string) => {
    const isInviteSubj = /(^|fw:|fwd:|re:|odpověď:|přeposláno:)\s*(accepted|declined|canceled|zrušeno|zrušená|přijato|odmítnuto|tentative|předběžně|updated|aktualizováno|invitation|pozvánka|new time proposed)/i.test(subj) || 
      /Předmět:.*(accepted|declined|canceled|zrušeno|zrušená|přijato|odmítnuto|tentative|předběžně|updated|aktualizováno|invitation|pozvánka|new time proposed)/i.test(note) ||
      /\.ics(\b|\n|,)/i.test(note);
    
    return isInviteSubj;
  };

  displayedActivities.forEach(a => {
    if (a.type === 'email' && a.note) {
      const subjMatch = a.note.match(/^Subject:\s*(.*)/i);
      const subj = subjMatch ? subjMatch[1].trim() : a.note.substring(0, 50);
      
      if (isCalendarInvite(subj, a.note)) {
        return; // Skip calendar invites
      }

      const key = subj + '_' + (a.date || a.createdAt).substring(0, 16);
      if (!seenEmailKeys.has(key)) {
        seenEmailKeys.add(key);
        uniqueActivities.push(a);
      }
    } else {
      uniqueActivities.push(a);
    }
  });
  displayedActivities = uniqueActivities;

  const totalPages = Math.ceil(displayedActivities.length / activitiesPerPage);
  const paginatedActivities = displayedActivities.slice((activityPage - 1) * activitiesPerPage, activityPage * activitiesPerPage);

  const toggleExpandActivity = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedActivities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTabChange = (tab: 'history' | 'calendar') => {
    setActiveTab(tab);
    setActivityPage(1);
  };


  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  
  React.useEffect(() => {
    if (currentUser && (currentUser.googleIntegration?.connected || currentUser.msIntegration?.connected)) {
      handleSyncBoth();
    }
  }, [currentUser?.id]); // auto sync on mount

  const handleSyncBoth = async () => {
    if (!currentUser) return;
    setIsSyncingEmails(true);
    
    try {
      const provider = currentUser.googleIntegration?.connected ? 'google' : 'microsoft';
      const credentials = provider === 'google' ? currentUser.googleIntegration : currentUser.msIntegration;
      
      // Gather relevant emails (deal owner, contact emails)
      const relevantEmails = [
        ...company.contacts.map(c => c.email),
        company.email
      ].filter(Boolean);

      // Sync Emails
      const resEmails = await apiFetch('/api/sync/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials, relevantEmails })
      });
      if (resEmails.ok) {
        const data = await resEmails.json();
        if (data.emails && data.emails.length > 0) {
          data.emails.forEach((email: any) => {
            // only add if subject/date doesn't already exist to avoid spamming
            const exists = activities.some(a => a.type === 'email' && a.note.includes(email.subject));
            if (!exists) {
              let noteContent = `Subject: ${email.subject}\nFrom: ${email.from}\n`;
              if (email.to) noteContent += `To: ${email.to}\n`;
              if (email.cc) noteContent += `Cc: ${email.cc}\n`;
              if (email.attachments && email.attachments.length > 0) noteContent += `Attachments: ${email.attachments.join(', ')}\n`;
              noteContent += `\n${email.body}`;

              addActivity({
                dealId: deal.id,
                type: 'email',
                date: email.date || new Date().toISOString(),
                note: noteContent,
                createdBy: currentUser.id,
                isVisible: true
              });
            }
          });
        }
      }

      // Sync Calendar Coming events
      const resCal = await apiFetch('/api/sync/fetch-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials, relevantEmails })
      });
      if (resCal.ok) {
        const dataCal = await resCal.json();
        if (dataCal.events) {
          const externalEvIds = new Set(dataCal.events.map((e: any) => e.id));

          dataCal.events.forEach((ev: any) => {
             // Try to update existing future meeting with existing externalEventId
             const existing = activities.find(a => 
               a.type !== 'email' && a.dealId === deal.id && 
               a.externalEventId && a.externalEventId === ev.id
             );
             if (existing && ev.date) {
               if (new Date(existing.date).getTime() !== new Date(ev.date).getTime() || existing.meetingLink !== ev.link || existing.note !== ev.subject) {
                 updateActivity(existing.id, { date: ev.date, meetingLink: ev.link, note: ev.subject });
                 // Notify the UI using our quick hack local alert
                 useStore.getState().addNotification(t('settings.integrations.calendarUpdated', `Upravena událost v kalendáři: ${ev.subject}`), 'info');
               }
             } else {
               // Fallback: match by subject/date if externalEventId is empty
               const existingFallback = activities.find(a => 
                 a.type !== 'email' && a.dealId === deal.id && !a.externalEventId &&
                 a.note === ev.subject && a.date && new Date(a.date) > new Date()
               );
               if (existingFallback && ev.date) {
                 if (new Date(existingFallback.date).getTime() !== new Date(ev.date).getTime() || existingFallback.meetingLink !== ev.link) {
                   updateActivity(existingFallback.id, { date: ev.date, meetingLink: ev.link, externalEventId: ev.id });
                   useStore.getState().addNotification(t('settings.integrations.calendarUpdated', `Upravena událost v kalendáři: ${ev.subject}`), 'info');
                 } else {
                   // Just save the mapping
                   updateActivity(existingFallback.id, { externalEventId: ev.id });
                 }
               } else if (ev.date) {
                 // Create new activity from calendar!
                 let determineType = 'meeting';
                 if (ev.link && ev.link.includes('teams.microsoft.com')) determineType = 'teams';
                 else if (ev.link && ev.link.includes('meet.google.com')) determineType = 'teams';
                 
                 addActivity({
                   dealId: deal.id,
                   type: determineType as any,
                   date: ev.date,
                   note: ev.subject || 'Schůzka',
                   createdBy: currentUser.id,
                   isVisible: true,
                   externalEventId: ev.id,
                   meetingLink: ev.link
                 });
                 useStore.getState().addNotification(t('settings.integrations.calendarCreated', `Přidána událost z kalendáře: ${ev.subject}`), 'success');
               }
             }
          });

          // check for deletes of future events
          const localFutureExternal = activities.filter(a => 
            a.dealId === deal.id && 
            a.type !== 'email' && 
            a.externalEventId && 
            new Date(a.date || a.createdAt) > new Date()
          );

          for (const lAct of localFutureExternal) {
            if (!externalEvIds.has(lAct.externalEventId)) {
                // Was deleted externally!
                useStore.getState().deleteActivity(lAct.id);
                useStore.getState().addNotification(t('settings.integrations.calendarDeleted', `Událost z kalendáře byla smazána: ${lAct.note}`), 'info');
            }
          }
        }
      }

      // Push unsynced local future activities to calendar
      const unsyncedActivities = activities.filter(a => 
        a.type !== 'email' && a.dealId === deal.id && !a.externalEventId && 
        a.createdBy === currentUser.id && new Date(a.date) > new Date()
      );

      for (const ua of unsyncedActivities) {
        try {
          const res = await apiFetch('/api/sync/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              credentials,
              action: 'create',
              activityDetails: {
                type: ua.type,
                date: ua.date,
                note: ua.note,
                attendees: [
                  currentUser.email,
                  ...(ua.participants || []).map(id => users.find(u => u.id === id)?.email || id).filter(Boolean)
                ]
              }
            })
          });
          if (res.ok) {
            const data = await res.json();
            updateActivity(ua.id, { 
              meetingLink: data.meetingLink || ua.meetingLink, 
              externalEventId: data.externalEventId 
            });
          }
        } catch (e) {
          console.error('Failed to push unsynced activity to calendar', e);
        }
      }

    } catch (err) {
      console.error('Email/Cal sync failed', err);
    } finally {
      setIsSyncingEmails(false);
    }
  };

  const [contactEmails, setContactEmails] = useState<string[]>([]);

  const handleSave = async () => {
    if (!currentUser || !note) return;
    
    let generatedMeetingLink = activityType === 'teams' ? meetingLink : undefined;
    let externalEventId: string | undefined = editingActivityId ? activities.find(a => a.id === editingActivityId)?.externalEventId : undefined;

    const attendees = [
      currentUser.email,
      ...participants.map(id => users.find(u => u.id === id)?.email).filter(Boolean),
      ...contactEmails
    ];

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
            action: editingActivityId ? 'update' : 'create',
            activityDetails: {
              type: activityType,
              date: activityDate,
              note,
              attendees,
              externalEventId
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.meetingLink && !generatedMeetingLink) {
            generatedMeetingLink = data.meetingLink;
          }
          if (data.externalEventId) {
            externalEventId = data.externalEventId;
          }
        }
      } catch (err) {
        console.error('Calendar sync failed', err);
      }
    }

    if (editingActivityId) {
       updateActivity(editingActivityId, {
         type: activityType,
         date: new Date(activityDate).toISOString(),
         note,
         meetingLink: generatedMeetingLink,
         recordingLink: activityType === 'teams' ? recordingLink : undefined,
         meetingSummary: activityType === 'teams' ? meetingSummary : undefined,
         participants: [...participants, ...contactEmails], // Storing email or ID
         isVisible,
         externalEventId
       });
    } else {
      addActivity({
        dealId: deal.id,
        type: activityType,
        date: new Date(activityDate).toISOString(),
        note,
        createdBy: currentUser.id,
        meetingLink: generatedMeetingLink,
        recordingLink: activityType === 'teams' ? recordingLink : undefined,
        meetingSummary: activityType === 'teams' ? meetingSummary : undefined,
        participants: [...participants, ...contactEmails], // Storing email or ID
        isVisible,
        externalEventId
      });
    }
    
    handleCancelActivityForm();
  };

  const [isSyncingActivityRef, setIsSyncingActivityRef] = useState<string | null>(null);

  const handleEditActivity = async (activity: Activity) => {
    if (activity.externalEventId) {
      setIsSyncingActivityRef(activity.id);
      await useStore.getState().syncGlobalCalendar();
      setIsSyncingActivityRef(null);
      
      const updatedActivity = useStore.getState().activities.find(a => a.id === activity.id);
      if (!updatedActivity) {
        return; // already deleted and notification shown by sync
      }
      activity = updatedActivity;
    }

    setEditingActivityId(activity.id);
    setActivityType(activity.type);
    setActivityDate(format(parseISO(activity.date || activity.createdAt), "yyyy-MM-dd'T'HH:mm"));
    setNote(activity.note);
    setMeetingLink(activity.meetingLink || '');
    setRecordingLink(activity.recordingLink || '');
    setMeetingSummary(activity.meetingSummary || '');
    
    const pUsers = (activity.participants || []).filter(p => users.some(u => u.id === p));
    const pEmails = (activity.participants || []).filter(p => !users.some(u => u.id === p));
    
    setParticipants(pUsers);
    setContactEmails(pEmails);
    setIsVisible(activity.isVisible ?? true);
    setIsAdding(true);
  };
  
  const handleDeleteActivity = async (activity: Activity) => {
    if (!currentUser || !confirm(t('common.confirmDelete', 'Opravdu chcete smazat tuto aktivitu?'))) return;
    
    // Call external calendar API if needed
    if (activity.externalEventId && (currentUser.msIntegration?.connected || currentUser.googleIntegration?.connected)) {
        try {
            const provider = currentUser.googleIntegration?.connected ? 'google' : 'microsoft';
            await apiFetch('/api/sync/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    credentials: provider === 'google' ? currentUser.googleIntegration : currentUser.msIntegration,
                    action: 'delete',
                    activityDetails: { externalEventId: activity.externalEventId }
                })
            });
        } catch (err) {
            console.error('Failed to delete from external calendar', err);
        }
    }

    useStore.getState().deleteActivity(activity.id);
  };

  const handleToggleVisibility = (activity: Activity) => {
      const isActVisible = activity.isVisible === undefined ? true : Boolean(activity.isVisible);
      useStore.getState().updateActivity(activity.id, { isVisible: !isActVisible });
  };
  
  const handleCancelActivityForm = () => {
    setIsAdding(false);
    setEditingActivityId(null);
    setNote('');
    setMeetingLink('');
    setRecordingLink('');
    setMeetingSummary('');
    setParticipants([]);
    setContactEmails([]);
    setIsVisible(true);
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

  const renderActivityNote = (activity: Activity, isExpanded: boolean) => {
    if (activity.type === 'email' && activity.note.startsWith('Subject: ')) {
      const parts = activity.note.split('\n\n');
      const headerBlock = parts[0];
      const bodyText = parts.slice(1).join('\n\n');
      
      return (
        <div className="mt-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-white border-b border-gray-100 space-y-1 text-xs">
            {headerBlock.split('\n').map((line, i) => {
              const colonIdx = line.indexOf(':');
              if (colonIdx === -1) return <div key={i}>{line}</div>;
              const key = line.substring(0, colonIdx).trim();
              const val = line.substring(colonIdx + 1).trim();
              
              if (key === 'Attachments' && val.length > 0) {
                const attachmentsItems = val.split(',').map(s => s.trim()).filter(Boolean);
                return (
                  <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-2 pt-1 border-t border-gray-50">
                    <span className="font-semibold text-gray-500 w-20 flex-shrink-0">{key}:</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {attachmentsItems.map((att, idx) => (
                        <a key={idx} href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); alert('Stahování příloh z emailu není v preview implementováno.'); }} className="text-indigo-600 font-medium hover:underline flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          {att}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                  <span className="font-semibold text-gray-500 w-20 flex-shrink-0">{key}:</span>
                  <span className="text-gray-900 break-all">{val}</span>
                </div>
              );
            })}
          </div>
          {isExpanded && (
            <div className="p-3 whitespace-pre-wrap text-gray-600 leading-relaxed overflow-y-auto custom-scrollbar">
              {bodyText.trim() ? bodyText : <span className="italic text-gray-400">Empty body</span>}
            </div>
          )}
        </div>
      );
    }

    if (!isExpanded) {
        return (
          <p className="text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis mt-2 leading-relaxed">
            {activity.note}
          </p>
        );
    }

    return (
      <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 bg-gray-50 border border-gray-100 p-3 rounded-lg leading-relaxed">
        {activity.note}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />{t('common.activities')}
            </h3>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => handleTabChange('history')}
              >
                History
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => handleTabChange('calendar')}
              >
                {t('activities.calendarFuture', 'Kalendář (budoucí)')}
              </button>
            </div>
            {activeTab === 'history' && (
              <select
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value as any);
                  setActivityPage(1);
                }}
                className="px-3 py-1 text-sm border-gray-300 rounded-md text-gray-700 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">Vše</option>
                <option value="email">E-maily</option>
                <option value="meeting">Schůzky/Hovory</option>
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {(currentUser?.googleIntegration?.connected || currentUser?.msIntegration?.connected) && canEdit && (
            <button 
              type="button"
              onClick={handleSyncBoth}
              disabled={isSyncingEmails}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingEmails ? 'animate-spin' : ''}`} />
              {t('common.sync', 'Synchronizovat')}
            </button>
          )}
          {canEdit && !isAdding && (
            <button 
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> {t('activities.add', 'Přidat aktivitu')}
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <h4 className="font-medium text-gray-900">{editingActivityId ? 'Edit Activity' : 'New Activity'}</h4>
          
          {!currentUser?.googleIntegration?.connected && !currentUser?.msIntegration?.connected && (
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg flex items-start gap-2">
               <svg className="w-5 h-5 flex-shrink-0 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <div>
                 <p className="font-semibold">{t('activities.syncWarningTitle', 'Nejste připojeni ke kalendáři')}</p>
                 <p>{t('activities.syncWarningText', 'Pro oboustrannou synchronizaci událostí si prosím připojte MS Office nebo Google v nastavení svého profilu.')}</p>
               </div>
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.activityType', 'Typ aktivity')}</label>
              <select 
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="meeting">{t('activities.typeMeeting', 'Osobní schůzka')}</option>
                <option value="call">{t('activities.typeCall', 'Telefonický hovor')}</option>
                <option value="teams">{t('activities.typeTeams', 'Teams schůzka')}</option>
                <option value="email">{t('activities.typeEmail', 'Email')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.dateTime', 'Datum a čas')}</label>
              <input 
                type="datetime-local"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            {activityType === 'teams' && (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.meetingLink', 'Odkaz na schůzku (volitelné)')}</label>
                  <input 
                    type="text"
                    placeholder="https://teams.microsoft.com/..."
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {editingActivityId && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.recordingLink', 'Odkaz na záznam videa na SharePointu')}</label>
                      <input 
                        type="url"
                        placeholder="https://sharepoint.com/..."
                        value={recordingLink}
                        onChange={(e) => setRecordingLink(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.meetingSummary', 'Zápis z callu (Summary / Copilot Review)')}</label>
                      <textarea 
                        value={meetingSummary}
                        onChange={(e) => setMeetingSummary(e.target.value)}
                        placeholder={t('activities.meetingSummaryPlaceholder', 'Vložte zápis z hovoru nebo Copilot Review...')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[100px]"
                      />
                    </div>
                  </>
                )}
              </>
            )}
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.participants', 'Účastníci')}</label>
              
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('activities.colleagues', 'Kolegové')}</span>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (participants.includes(u.id)) {
                          setParticipants(participants.filter(id => id !== u.id));
                        } else {
                          setParticipants([...participants, u.id]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                        participants.includes(u.id) 
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      } border`}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{t('activities.companyContacts', 'Kontakty společnosti')}</span>
                <div className="flex flex-wrap gap-2 items-center">
                  {company.contacts.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!c.email}
                      onClick={() => {
                        if (!c.email) return;
                        if (contactEmails.includes(c.email)) {
                          setContactEmails(contactEmails.filter(e => e !== c.email));
                        } else {
                          setContactEmails([...contactEmails, c.email]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                        contactEmails.includes(c.email) 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      } border ${!c.email && 'opacity-50 cursor-not-allowed'}`}
                    >
                      {c.name} {c.email ? '' : '(No Email)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('activities.notesDescription', 'Poznámka / Popis *')}</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('activities.notesPlaceholder', 'Co se řešilo?')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[100px]"
              />
            </div>
            
            {(currentUser?.role === 'administrator' || currentUser?.role === 'cso') && (
              <div className="col-span-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">{t('activities.visibleToEveryone', 'Viditelné pro všechny')}</span>
                </label>
                <p className="text-xs text-gray-500 ml-6 mt-0.5">{t('activities.visibleToEveryoneDesc', 'Pokud není zaškrtnuto, uvidí tuto aktivitu pouze administrátoři a CSOs.')}</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={handleCancelActivityForm} className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-lg hover:bg-gray-50">{t('activities.cancel', 'Zrušit')}</button>
            <button onClick={handleSave} disabled={!note} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">{t('activities.saveActivity', 'Uložit aktivitu')}</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {paginatedActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            {activeTab === 'history' ? 'No activities recorded yet.' : 'No upcoming activities.'}
          </div>
        ) : (
          paginatedActivities.map(activity => {
            const user = users.find(u => u.id === activity.createdBy);
            const isActivityVisible = activity.isVisible === undefined ? true : Boolean(activity.isVisible);
            const isHidden = !isActivityVisible;
            const canEditActivity = (currentUser?.id === activity.createdBy || currentUser?.role === 'administrator' || currentUser?.role === 'cso') && activity.type !== 'email' && new Date(activity.date || activity.createdAt) > now;
            const isExpanded = expandedActivities.has(activity.id);
            
            return (
              <div 
                key={activity.id} 
                onClick={(e) => toggleExpandActivity(activity.id, e)}
                className={`border rounded-xl p-4 shadow-sm transition-shadow relative cursor-pointer ${isHidden ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
                  <div className="text-xs text-gray-400">
                    {format(parseISO(activity.createdAt), 'MMM d, yyyy HH:mm')}
                  </div>
                  {canEditActivity && (
                    <div className="flex gap-2 items-center">
                      <button type="button" disabled={isSyncingActivityRef === activity.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditActivity(activity); }} className={`${isSyncingActivityRef === activity.id ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'} transition-colors disabled:opacity-50`} title={t('common.edit', 'Editovat')}>
                        {isSyncingActivityRef === activity.id ? (
                           <RefreshCw className="w-4 h-4 animate-spin pointer-events-none" />
                        ) : (
                           <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        )}
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteActivity(activity); }} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                  {(currentUser?.role === 'administrator' || currentUser?.role === 'cso') && (
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleVisibility(activity); }} className={`relative z-20 p-1 ${isHidden ? 'text-red-500' : 'text-gray-400'} hover:text-red-700 transition-colors ml-1`} title={isHidden ? "Make visible" : "Make invisible"}>
                      {isHidden ? (
                        <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg border flex-shrink-0 ${getActivityColor(activity.type)} ${isHidden ? 'opacity-60' : ''}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className={`flex-1 min-w-0 pr-24 ${isHidden ? 'opacity-70' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{getActivityLabel(activity.type)}</span>
                      {isHidden && <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Hidden</span>}
                      <span className="text-xs text-gray-500">
                        planned on <span className="font-medium text-gray-700">{format(parseISO(activity.date || activity.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      </span>
                    </div>
                    
                    {renderActivityNote(activity, isExpanded)}
                    
                    {activity.type === 'teams' && activity.meetingLink && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={activity.meetingLink} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-200">
                          <Video className="w-3.5 h-3.5" />
                          {t('activities.joinTeamsMeeting', 'Join Teams Meeting')}
                        </a>
                        {activity.recordingLink && (
                           <a href={activity.recordingLink} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200">
                             <Video className="w-3.5 h-3.5" />
                             {t('activities.playRecording', 'Záznam hovoru / SharePoint')}
                           </a>
                        )}
                      </div>
                    )}
                    
                    {isExpanded && activity.type === 'teams' && activity.meetingSummary && (
                      <div className="mt-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs text-gray-700">
                        <div className="font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {t('activities.meetingSummaryTitle', 'Zápis / Copilot Review')}
                        </div>
                        <div className="whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {activity.meetingSummary}
                        </div>
                      </div>
                    )}
                    
                    {isExpanded && activity.transcript && (!activity.meetingSummary) && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
                        <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Copilot Transcript
                        </div>
                        <div className="whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {activity.transcript}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <UserIcon className="w-3.5 h-3.5" />
                        Recorded by <span className="font-medium">{user?.name || 'Unknown User'}</span>
                      </div>
                      
                      {activity.participants && activity.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 border-l border-gray-300 pl-4">
                          <span className="font-medium">Shared with:</span>
                          <div className="flex flex-wrap gap-1">
                            {activity.participants.map(pid => {
                              const puser = users.find(u => u.id === pid);
                              if (puser) return <span key={pid} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">{puser.name}</span>;
                              // Check if it's an email string
                              if (pid.includes('@')) return <span key={pid} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">{pid}</span>;
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button 
            onClick={() => setActivityPage(p => Math.max(1, p - 1))}
            disabled={activityPage === 1}
            className="text-sm text-indigo-600 font-medium disabled:opacity-50"
          >
            {t('common.prev', 'Previous')}
          </button>
          <span className="text-xs text-gray-500">{t('common.pageOf', { current: activityPage, total: totalPages, defaultValue: `Page ${activityPage} of ${totalPages}` })}</span>
          <button 
            onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
            disabled={activityPage === totalPages}
            className="text-sm text-indigo-600 font-medium disabled:opacity-50"
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentsManager({ deal, company, canEdit }: { deal: Deal, company: Company, canEdit: boolean }) {
  const { t } = useTranslation();
  const { updateDeal, currentUser, users } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  
  const documents = deal.documents || [];

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !description.trim()) return;
    
    setIsUploading(true);
    const ico = company.companyId || 'unknown_ico';
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const documentPrefix = `doc_${uuidv4().substring(0,8)}`;
    
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
      
      const newDoc: DealDocument = {
        id: uuidv4(),
        description: description,
        filename: `${documentPrefix}${ext}`,
        url: uploadData.fileUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.id
      };

      const newDocs = [...documents, newDoc];
      await updateDeal(deal.id, { documents: newDocs }, currentUser.id);
      
      setDescription('');
      setSelectedFileName('');
      setIsModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const ROLE_RANK: Record<string, number> = {
    hunter: 1,
    closer: 2,
    farmer: 3,
    cso: 4,
    administrator: 5
  };

  const canEditOrDeleteDocument = (doc: DealDocument) => {
    if (!currentUser) return false;
    const uploader = users.find(u => u.id === doc.uploadedBy);
    const uploaderRole = uploader?.role || 'hunter';
    const uploaderRank = ROLE_RANK[uploaderRole] || 1;
    const currentUserRank = ROLE_RANK[currentUser.role] || 1;

    if (currentUser.role === 'administrator' || currentUser.role === 'cso') return true;
    if (uploader?.managerId === currentUser.id) return true; 

    if (currentUserRank > uploaderRank) return true;

    if (currentUserRank === uploaderRank) {
      if (currentUser.role === 'hunter' && deal.hunterId === currentUser.id) return true;
      if (currentUser.role === 'closer' && deal.closerId === currentUser.id) return true;
      if (currentUser.role === 'farmer' && deal.farmerId === currentUser.id) return true;
    }
    return false;
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(t('common.deleteConfirm', 'Opravdu smazat?'))) return;
    const newDocs = documents.filter(d => d.id !== docId);
    await updateDeal(deal.id, { documents: newDocs }, currentUser.id);
  };

  const handleEditStart = (doc: DealDocument) => {
    setEditingDocId(doc.id);
    setEditDescription(doc.description);
  };

  const handleEditSave = async (docId: string) => {
    if (!editDescription.trim()) return;
    const newDocs = documents.map(d => d.id === docId ? { ...d, description: editDescription } : d);
    await updateDeal(deal.id, { documents: newDocs }, currentUser.id);
    setEditingDocId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-gray-400" />{t('common.documents', 'Dokumenty')}
        </h3>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded font-medium text-sm hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            {t('common.addDocument', 'Přidat dokument')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            {t('common.noDocuments', 'Zatím nebyly nahrány žádné dokumenty.')}
          </div>
        ) : (
          documents.map(doc => {
            const user = users.find(u => u.id === doc.uploadedBy);
            const isAuthorized = canEditOrDeleteDocument(doc);
            
            return (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0 pr-4">
                  {editingDocId === doc.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button onClick={() => handleEditSave(doc.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title={t('common.save', 'Uložit')}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingDocId(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title={t('common.cancel', 'Zrušit')}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate" title={doc.description}>{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        {doc.filename || t('common.view', 'Zobrazit')}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {doc.filename}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">&bull;</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {user?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">&bull;</span>
                    <span className="text-xs text-gray-500">
                      {format(parseISO(doc.uploadedAt), 'd.M.yyyy HH:mm')}
                    </span>
                  </div>
                </div>
                {isAuthorized && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditStart(doc)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title={t('common.edit', 'Upravit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title={t('common.delete', 'Smazat')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('common.addDocument', 'Přidat dokument')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.documentDescription', 'Popis dokumentu')} *</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 outline-none text-sm"
                  placeholder={t('common.enterDocumentDescription', 'Zadejte popis dokumentu...')}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.selectFile', 'Vybrat soubor')} *</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFileName(e.target.files[0].name);
                    else setSelectedFileName('');
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-medium text-sm hover:bg-indigo-100 transition-colors"
                  >
                    {t('common.chooseFile', 'Vybrat soubor')}
                  </button>
                  <span className="text-sm text-gray-500 truncate max-w-[200px]" title={selectedFileName || t('common.noFileChosen', 'Nevybrán žádný soubor')}>
                    {selectedFileName || t('common.noFileChosen', 'Nevybrán žádný soubor')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setDescription('');
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                disabled={isUploading}
              >
                {t('common.cancel', 'Zrušit')}
              </button>
              <button
                onClick={() => {
                  if (selectedFileName && description.trim()) {
                     handleFileUpload({ target: fileInputRef.current } as any);
                  }
                }}
                disabled={!selectedFileName || !description.trim() || isUploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('common.uploading', 'Nahrávání...')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t('common.upload', 'Nahrát')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotesManager({ deal, company, canEdit }: { deal: Deal, company: Company, canEdit: boolean }) {
  const { t } = useTranslation();
  const { updateDeal, currentUser, users } = useStore();
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const subordinateIds = getSubordinateIds(users, currentUser?.id || '');

  const sortedNotes = [...(deal.notes || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(sortedNotes.length / itemsPerPage);
  const paginatedNotes = sortedNotes.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const canEditOrDeleteNote = (noteId: string, authorId: string) => {
    if (!currentUser) return false;
    if (currentUser.id === authorId) return true;
    if (currentUser.role === 'cso' || currentUser.role === 'administrator') return true;
    if (subordinateIds.includes(authorId)) return true; // Author is subordinate
    return false;
  };

  const handleCreate = async () => {
    if (!newNote.trim() || !currentUser) return;
    const note: any = {
      id: uuidv4(),
      text: newNote.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };
    await updateDeal(deal.id, { notes: [...(deal.notes || []), note] }, currentUser.id);
    setNewNote('');
    setPage(1);
  };

  const handleUpdate = async (id: string) => {
    if (!editNoteText.trim() || !currentUser) return;
    const newNotes = (deal.notes || []).map(n => 
      n.id === id ? { ...n, text: editNoteText.trim(), updatedAt: new Date().toISOString() } : n
    );
    await updateDeal(deal.id, { notes: newNotes }, currentUser.id);
    setEditingNoteId(null);
  };

  const handleDelete = async () => {
    if (!currentUser || !noteToDelete) return;
    const newNotes = (deal.notes || []).filter(n => n.id !== noteToDelete);
    await updateDeal(deal.id, { notes: newNotes }, currentUser.id);
    setNoteToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          {t('common.notes', 'Poznámky')}
        </h3>
      </div>
      
      {canEdit && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t('common.newNote', 'Nová poznámka...')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!newNote.trim()}
              className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {t('common.add', 'Přidat')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {paginatedNotes.map(note => {
           const author = users.find(u => u.id === note.createdBy);
           const isEditable = canEditOrDeleteNote(note.id, note.createdBy);

           return (
             <div key={note.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group">
               <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2 text-xs text-gray-500">
                   <UserIcon className="w-3 h-3" />
                   <span className="font-medium text-gray-700">{author?.name || 'Unknown'}</span>
                   <span>•</span>
                   <span>{format(parseISO(note.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                   {note.updatedAt && <span className="text-gray-400 italic">(Upraveno)</span>}
                 </div>
                 {isEditable && (
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button title={t('common.edit')} onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                     <button title={t('common.delete')} onClick={() => setNoteToDelete(note.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 )}
               </div>
               
               {editingNoteId === note.id ? (
                 <div className="mt-2">
                   <textarea
                     value={editNoteText}
                     onChange={(e) => setEditNoteText(e.target.value)}
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-indigo-500 text-sm"
                   />
                   <div className="flex gap-2 mt-2 justify-end">
                      <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                      <button onClick={() => handleUpdate(note.id)} disabled={!editNoteText.trim()} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50">{t('common.save')}</button>
                   </div>
                 </div>
               ) : (
                 <p className="text-gray-800 text-sm whitespace-pre-wrap">{note.text}</p>
               )}
             </div>
           );
        })}
        {sortedNotes.length === 0 && <p className="text-sm text-gray-500 text-center py-4">{t('common.noRecords', 'Žádné záznamy')}</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button 
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-sm text-indigo-600 font-medium disabled:opacity-50"
          >
            {t('common.prev', 'Previous')}
          </button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button 
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="text-sm text-indigo-600 font-medium disabled:opacity-50"
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!noteToDelete}
        title={t('common.deleteNoteTitle', 'Smazat poznámku')}
        message={t('common.confirmDelete', 'Opravdu chcete smazat tento záznam?')}
        confirmText={t('common.delete', 'Smazat')}
        cancelText={t('common.cancel', 'Zrušit')}
        onConfirm={handleDelete}
        onClose={() => setNoteToDelete(null)}
      />
    </div>
  );
}
