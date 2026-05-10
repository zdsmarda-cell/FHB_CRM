import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { STAGES, getDealsForUser, canViewStage } from '../../lib/permissions';
import { Stage } from '../../types';
import { format, parseISO } from 'date-fns';
import { Building2, Calendar, Ban } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { CompanyForm } from '../modals/CompanyForm';
import { useNavigate } from 'react-router-dom';

export function KanbanBoard() {
  const { t } = useTranslation();
  const state = useStore();
  const { currentUser, companies, updateDealStage } = state;
  const [isFormOpen, setIsFormOpen] = useState(false);
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
      updateDealStage(dealId, stage, currentUser.id);
    }
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
                      
                      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded capitalize">
                          {company.segment}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {format(parseISO(deal.updatedAt), 'MMM d')}
                        </span>
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
    </div>
  );
}
