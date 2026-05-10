import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { ArrowLeft, Clock, User as UserIcon, Plus, X, Upload, Mail, Phone, Ban, Calendar, AlertTriangle, Video, MessageSquare } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { Contact, Company, Region, Segment, Deal, Activity, ActivityType } from '../../types';
import { getSubordinateIds } from '../../lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export function DealDetailsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deals, companies, auditLogs, users, currentUser, updateCompany } = useStore();

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
                  deal.ownerId === currentUser.id || 
                  subordinateIds.includes(deal.ownerId);

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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{company.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('fields.ico')}: {company.companyId}</p>
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
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Contacts
              </h3>
            </div>
            
            <ContactsManager companyId={company.id} contacts={company.contacts} canEdit={canEdit} />

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
            <Clock className="w-5 h-5 text-gray-400" />
            History
          </h3>
          
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
                    {user?.name || 'Unknown User'}
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
          <input 
            value={formData.phone || ''} 
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
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
        <span className="font-medium text-gray-900">{company.phone || '-'}</span>
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

function ContactsManager({ companyId, contacts, canEdit }: { companyId: string, contacts: Contact[], canEdit: boolean }) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { updateCompany, currentUser, users } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSaveContact = () => {
    setSubmitAttempted(true);
    
    if (!newContact.name || !newContact.position || (!newContact.email && !newContact.phone)) {
      return;
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
        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
        
        setNewContact(prev => ({
          ...prev,
          photoUrl: imgUrl,
          photoWebpUrl: webpDataUrl
        }));
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {contacts.map(contact => (
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
            />
          ) : (
            <div className={`group flex gap-4 p-4 border border-gray-200 rounded-lg ${contact.isActive === false ? 'bg-gray-100 opacity-60' : 'bg-gray-50/50'}`}>
              <div className="flex-shrink-0">
                {contact.photoWebpUrl ? (
                  <a href={contact.photoUrl} target="_blank" rel="noreferrer" title="Click to view full image">
                    <img src={contact.photoWebpUrl} alt={contact.name} className="w-16 h-16 rounded-full object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
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
                          <button onClick={() => handleEditClick(contact)} className="text-xs text-indigo-600 font-medium hover:underline">Edit</button>
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
                      <span className={contact.doNotContact ? 'text-gray-400 line-through' : ''}>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {canEdit && !isAdding && !editingId && (
        <button 
          onClick={() => {
            setIsAdding(true);
            setNewContact({ isActive: true });
            setSubmitAttempted(false);
          }}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Contact
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
        />
      )}
    </div>
  )
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
  isEditing
}: any) {
  const missingEmailPhone = submitAttempted && !contact.email && !contact.phone;

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-4">
      <h4 className="font-medium text-gray-900">{isEditing ? 'Edit Contact' : 'New Contact'}</h4>
      
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div 
            className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors bg-cover bg-center"
            style={contact.photoWebpUrl ? { backgroundImage: `url(${contact.photoWebpUrl})`, borderStyle: 'solid' } : {}}
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
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input 
            value={contact.email || ''} 
            onChange={e => setContact({...contact, email: e.target.value})} 
            className={`w-full px-3 py-2 border ${missingEmailPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
          />
          {missingEmailPhone && <p className="mt-1 text-xs text-red-600">{t('errors.emailOrPhoneRequired')}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input 
            value={contact.phone || ''} 
            onChange={e => setContact({...contact, phone: e.target.value})} 
            className={`w-full px-3 py-2 border ${missingEmailPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} rounded text-sm outline-none`} 
          />
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
      stage: 'lead',
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
      stage: 'lead',
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
  const { activities, addActivity, users, currentUser } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('meeting');
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [note, setNote] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  const dealActivities = activities
    .filter(a => a.dealId === deal.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = () => {
    if (!currentUser || !note) return;
    
    addActivity({
      dealId: deal.id,
      type: activityType,
      date: new Date(activityDate).toISOString(),
      note,
      createdBy: currentUser.id,
      meetingLink: activityType === 'teams' ? meetingLink : undefined,
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
          <MessageSquare className="w-5 h-5 text-gray-400" />
          Activities
        </h3>
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
