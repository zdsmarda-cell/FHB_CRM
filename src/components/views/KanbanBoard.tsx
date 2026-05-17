import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { STAGES, getDealsForUser, canViewStage, getSubordinateIds } from '../../lib/permissions';
import { Stage, User, Deal } from '../../types';
import { format, parseISO } from 'date-fns';
import { Building2, Calendar, Ban, UserPlus, Users } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { CompanyForm } from '../modals/CompanyForm';
import { ChangeAssigneeModal } from '../modals/ChangeAssigneeModal';
import { LostDealModal } from '../modals/LostDealModal';
import { useNavigate } from 'react-router-dom';
import { AlertModal } from '../modals/AlertModal';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-teal-500',
];

export const getCurrentAssigneeId = (deal: Deal, stage?: Stage) => {
  const currentStage = stage || deal.stage;
  if (currentStage === 'lead_opportunity') return deal.hunterId;
  if (currentStage === 'discovery_proposal') return deal.closerId;
  if (currentStage === 'contracting' || currentStage === 'farming') return deal.farmerId;
  return deal.hunterId || deal.closerId || deal.farmerId;
};

export const getAssigneeField = (stage: Stage) => {
  if (stage === 'lead_opportunity') return 'hunterId';
  if (stage === 'discovery_proposal') return 'closerId';
  if (stage === 'contracting' || stage === 'farming') return 'farmerId';
  return 'hunterId';
};

export function KanbanBoard() {
  const { t } = useTranslation();
  const state = useStore();
  const { currentUser, companies, updateDealStage, users } = state;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assigneeModalDeal, setAssigneeModalDeal] = useState<Deal | null>(null);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean; message: string; }>({ isOpen: false, message: '' });
  const navigate = useNavigate();

  useEffect(() => {
    state.refreshState();
  }, []);

  const visibleDeals = getDealsForUser(state, currentUser);

  const visibleStages = STAGES.filter(stage => 
    currentUser?.role === 'administrator' || 
    currentUser?.role === 'cso' || 
    canViewStage(currentUser, stage) ||
    stage === 'lost'
  );

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId && currentUser) {
      const deal = state.deals.find(d => d.id === dealId);
      if (!deal) return;
      
      const order = ['lead_opportunity', 'discovery_proposal', 'contracting', 'farming', 'lost'];
      const currentIdx = order.indexOf(deal.stage);
      const targetIdx = order.indexOf(stage);
      const isForwardMove = targetIdx > currentIdx && stage !== 'lost';

      if (isForwardMove) {
        if (deal.stage === 'lead_opportunity') {
          if (!deal.hunterId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingHunter') });
            return;
          }
          if (!deal.leadSourceId || !deal.ecommercePlatformId || !deal.estimatedMonthlyParcels || deal.estimatedMonthlyParcels <= 0) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingAttributes') });
            return;
          }
        }
        if (deal.stage === 'discovery_proposal') {
          if (!deal.closerId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingCloser') });
            return;
          }
          if (!deal.deliveryCountries?.length || !deal.averageItemsPerOrder || !deal.averageParcelWeight || !deal.averageParcelVolume || !deal.pricingOffers?.length) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingCloserAttributes', 'Prvně musíte vyplnit atributy produktu (země doručení, ks, váha, objem) a přidat cenovou nabídku, než můžete posunout do dalšího stavu.') });
            return;
          }
        }
        if (deal.stage === 'contracting' && !deal.farmerId) {
          setAlertInfo({ isOpen: true, message: t('errors.kanban.missingFarmer') });
          return;
        }
      }
      
      if (stage === 'lost' && deal.stage !== 'lost') {
        setLostDealId(dealId);
      } else {
        updateDealStage(dealId, stage, currentUser.id);
      }
    }
  };

  const userInitialsAndColors = useMemo(() => {
    const mapping: Record<string, { initials: string, color: string, name: string }> = {};
    const initialsCount: Record<string, number> = {};
    
    const sortedUsers = [...users].sort((a,b) => a.name.localeCompare(b.name));
    
    for (const user of sortedUsers) {
      const parts = user.name.trim().split(/\s+/);
      let initials = '??';
      if (parts.length >= 2) {
        initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        initials = parts[0].substring(0, 2).toUpperCase();
      } else if (parts.length === 1 && parts[0].length === 1) {
        initials = parts[0].toUpperCase();
      }
      
      if (initialsCount[initials] === undefined) {
        initialsCount[initials] = 0;
      } else {
        initialsCount[initials]++;
      }
      
      const colorIndex = initialsCount[initials] % AVATAR_COLORS.length;
      mapping[user.id] = { initials, color: AVATAR_COLORS[colorIndex], name: user.name };
    }
    return mapping;
  }, [users]);

  const canTakeDeal = (deal: Deal) => {
    const curId = getCurrentAssigneeId(deal);
    if (!currentUser || curId) return false;
    if (currentUser.role === 'administrator' || currentUser.role === 'cso') return true;
    return canViewStage(currentUser, deal.stage);
  };

  const canChangeAssignee = (deal: Deal) => {
    if (!currentUser) return false;
    if (currentUser.role === 'administrator' || currentUser.role === 'cso') return true;
    
    const curId = getCurrentAssigneeId(deal);
    if (curId) {
       const owner = users.find(u => u.id === curId);
       if (owner && owner.managerId === currentUser.id) return true;
    } else {
       if (getSubordinateIds(users, currentUser.id).length > 0) return true;
    }
    return false;
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('menu.board')}</h2>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          {t('menu.newDeal')}
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start">
        {visibleStages.map(stage => {
          const stageDeals = visibleDeals.filter(d => d.stage === stage);
          
          return (
            <div 
              key={stage}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className="min-w-[320px] w-[320px] bg-gray-100/70 rounded-xl p-4 flex flex-col h-full border border-gray-200/60 shadow-inner"
            >
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-semibold text-gray-700 uppercase tracking-wider text-xs">
                  {t(`stages.${stage}`)}
                </h3>
                <span className="bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-gray-300">
                  {stageDeals.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageDeals.map(deal => {
                  const company = companies.find(c => c.id === deal.companyId);
                  if (!company) return null;

                  const curId = getCurrentAssigneeId(deal);
                  const ownerInfo = curId ? userInitialsAndColors[curId] : null;

                  return (
                    <div 
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => navigate(`/deal/${deal.id}`)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 leading-tight truncate">
                            {company.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {t('fields.ico')}: {company.companyId}
                          </p>
                        </div>
                        {deal.stage === 'lost' && deal.postponedUntil && (
                          <div title={`Postponed until: ${format(parseISO(deal.postponedUntil), 'MMM d, yyyy')}\nReason: ${deal.postponedReason}`} className="text-orange-500 bg-orange-50 p-1.5 rounded-lg flex-shrink-0 cursor-help">
                            <Calendar className="w-4 h-4" />
                          </div>
                        )}
                        {deal.stage === 'lost' && deal.lostPermanently && (
                          <div title={`Reason: ${deal.lostReason}`} className="text-red-500 bg-red-50 p-1.5 rounded-lg flex-shrink-0 cursor-help">
                            <Ban className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-end">
                        <div className="flex flex-col gap-2">
                          <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded capitalize w-fit">
                            {company.segment}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium ml-1">
                            {format(parseISO(deal.updatedAt), 'MMM d')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canTakeDeal(deal) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const willAdvance = 
                                  deal.stage === 'lead_opportunity' &&
                                  deal.leadSourceId &&
                                  deal.ecommercePlatformId &&
                                  deal.estimatedMonthlyParcels &&
                                  deal.estimatedMonthlyParcels > 0;
                                  
                                if (willAdvance) {
                                  if (!window.confirm(`Převzetím bude příležitost automaticky posunuta do fáze ${t('stages.discovery_proposal')}. Chcete pokračovat?`)) {
                                    return;
                                  }
                                }
                                
                                const updates: Partial<Deal> = { [getAssigneeField(deal.stage)]: currentUser!.id };
                                if (willAdvance) {
                                  updates.stage = 'discovery_proposal';
                                }
                                state.updateDeal(deal.id, updates, currentUser!.id);
                              }}
                              className="mr-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded border border-indigo-200 transition-colors"
                            >
                              Převzít
                            </button>
                          )}
                          {canChangeAssignee(deal) && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigneeModalDeal(deal);
                              }}
                              className="p-1 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Změnit řešitele"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white cursor-help ${ownerInfo ? ownerInfo.color : 'bg-gray-300'}`}
                            title={ownerInfo ? ownerInfo.name : 'bez řešitele'}
                          >
                            {ownerInfo ? ownerInfo.initials : '?'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {isFormOpen && (
        <CompanyForm onClose={() => setIsFormOpen(false)} />
      )}
      
      {assigneeModalDeal && (
        <ChangeAssigneeModal 
          deal={assigneeModalDeal} 
          onClose={() => setAssigneeModalDeal(null)} 
        />
      )}

      {lostDealId && (
        <LostDealModal
          dealId={lostDealId}
          onClose={() => setLostDealId(null)}
        />
      )}

      <AlertModal
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ isOpen: false, message: '' })}
        title={t('common.error', 'Chyba')}
        message={alertInfo.message}
      />
    </div>
  );
}
