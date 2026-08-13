import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { STAGES, getDealsForUser, canViewStage, getSubordinateIds } from '../../lib/permissions';
import { Stage, User, Deal } from '../../types';
import { format, parseISO } from 'date-fns';
import { Building2, Calendar, Ban, UserPlus, Users, List, Kanban, Globe, Tag, Filter, Search, User as UserIcon, X } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CompanyForm } from '../modals/CompanyForm';
import { ChangeAssigneeModal } from '../modals/ChangeAssigneeModal';
import { LostDealModal } from '../modals/LostDealModal';
import { useNavigate } from 'react-router-dom';
import { AlertModal } from '../modals/AlertModal';
import { DealsListView } from './DealsListView';
import { MultiSelectPopover } from '../common/MultiSelectPopover';
import { COUNTRIES } from '../../lib/countryMapping';

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
  if (currentStage === 'opportunity' || currentStage === 'lead') return deal.hunterId;
  if (currentStage === 'discovery_proposal' || currentStage === 'contracting' || currentStage === 'onboarding') return deal.closerId;
  if (currentStage === 'farming') return deal.farmerId;
  if (currentStage === 'lost') {
    const originalStage = deal.lostFromStage;
    if (originalStage === 'farming') return deal.farmerId;
    if (originalStage === 'discovery_proposal' || originalStage === 'contracting' || originalStage === 'onboarding') return deal.closerId;
    if (originalStage === 'opportunity' || originalStage === 'lead') return deal.hunterId;
    
    // Fallback if lostFromStage is missing for older deals
    if (deal.farmerId !== null) return deal.farmerId;
    if (deal.closerId !== null) return deal.closerId;
    return deal.hunterId;
  }
  return deal.hunterId || deal.closerId || deal.farmerId;
};

export const getAssigneeField = (stage: Stage, deal?: Deal) => {
  if (stage === 'opportunity' || stage === 'lead') return 'hunterId';
  if (stage === 'discovery_proposal' || stage === 'contracting' || stage === 'onboarding') return 'closerId';
  if (stage === 'farming') return 'farmerId';
  if (stage === 'lost' && deal) {
    const originalStage = deal.lostFromStage;
    if (originalStage === 'farming') return 'farmerId';
    if (originalStage === 'discovery_proposal' || originalStage === 'contracting' || originalStage === 'onboarding') return 'closerId';
    if (originalStage === 'opportunity' || originalStage === 'lead') return 'hunterId';

    if (deal.farmerId !== null) return 'farmerId';
    if (deal.closerId !== null) return 'closerId';
    return 'hunterId';
  }
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
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(() => {
    return localStorage.getItem('kanban_unassigned') === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('kanban_unassigned', showUnassignedOnly.toString());
  }, [showUnassignedOnly]);

  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('kanban_zoom');
    return saved ? parseFloat(saved) : 1;
  });
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    return (localStorage.getItem('board_view_mode') as 'kanban' | 'list') || 'kanban';
  });
  const navigate = useNavigate();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  useEffect(() => {
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setBoardScrollWidth(scrollContainerRef.current.scrollWidth);
      }
    };
    updateWidth();
    const t = setTimeout(updateWidth, 150);
    return () => clearTimeout(t);
  });

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (scrollContainerRef.current) {
      isSyncingBottom.current = true;
      scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };


  useEffect(() => {
    localStorage.setItem('kanban_zoom', zoomLevel.toString());
  }, [zoomLevel]);

  useEffect(() => {
    localStorage.setItem('board_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    state.refreshState();
  }, []);

  const countryOptions = useMemo(() => {
    const presentCountries = new Set<string>();
    companies.forEach(c => {
      if (c.country) presentCountries.add(c.country);
    });
    state.deals.forEach(d => {
      d.deliveryCountries?.forEach(dc => presentCountries.add(dc));
    });
    COUNTRIES.forEach(c => presentCountries.add(c));
    return Array.from(presentCountries).sort().map(c => ({
      id: c,
      label: c
    }));
  }, [companies, state.deals]);

  const segmentOptions = useMemo(() => {
    return state.segments.filter(s => s.isActive).map(s => ({
      id: s.id,
      label: s.name
    }));
  }, [state.segments]);

  const visibleDeals = useMemo(() => {
    let deals = getDealsForUser(state, currentUser);
    
    // Filter out deals where company is explicitly marked as not visible
    deals = deals.filter(d => {
      const company = state.companies.find(c => c.id === d.companyId);
      return company ? company.isVisible !== false : true;
    });

    if (showUnassignedOnly) {
      deals = deals.filter(d => !getCurrentAssigneeId(d));
    }

    if (state.kanbanUserFilter) {
      deals = deals.filter(d => 
        d.hunterId === state.kanbanUserFilter || 
        d.closerId === state.kanbanUserFilter || 
        d.farmerId === state.kanbanUserFilter
      );
    }

    if (state.kanbanCompanySearch && state.kanbanCompanySearch.trim() !== '') {
      const searchLower = state.kanbanCompanySearch.trim().toLowerCase();
      deals = deals.filter(d => {
        const company = state.companies.find(c => c.id === d.companyId);
        return company && company.name.toLowerCase().includes(searchLower);
      });
    }

    if (state.kanbanCountryFilter && state.kanbanCountryFilter.length > 0) {
      deals = deals.filter(d => {
        const company = state.companies.find(c => c.id === d.companyId);
        if (!company) return false;
        const compCountry = company.country || 'Czechia';
        const delCountries = d.deliveryCountries || [];
        return state.kanbanCountryFilter.some(selected => 
          selected === compCountry || delCountries.includes(selected)
        );
      });
    }

    if (state.kanbanSegmentFilter && state.kanbanSegmentFilter.length > 0) {
      deals = deals.filter(d => {
        const company = state.companies.find(c => c.id === d.companyId);
        if (!company) return false;
        return state.kanbanSegmentFilter.includes(company.segment || '');
      });
    }

    return deals;
  }, [
    state.deals,
    state.companies,
    currentUser,
    showUnassignedOnly,
    state.kanbanUserFilter,
    state.kanbanCompanySearch,
    state.kanbanCountryFilter,
    state.kanbanSegmentFilter
  ]);

  const visibleStages = STAGES.filter(stage => 
    currentUser?.role === 'administrator' || 
    currentUser?.role === 'cso' || 
    canViewStage(currentUser, stage) ||
    stage === 'lost'
  );

  const scrollIntervalRef = useRef<number | null>(null);

  const startAutoScroll = (direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: direction === 'right' ? 10 : -10 });
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragEnd = () => {
    stopAutoScroll();
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;
    
    // Calculate distance from edges to trigger auto-scroll
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 100; // pixels from edge
    
    const distanceToLeft = e.clientX - rect.left;
    const distanceToRight = rect.right - e.clientX;
    
    // Only scroll if we are not at the very edge of the scroll properties
    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth;

    if (distanceToLeft < edgeThreshold && canScrollLeft) {
      startAutoScroll('left');
    } else if (distanceToRight < edgeThreshold && canScrollRight) {
      startAutoScroll('right');
    } else {
      stopAutoScroll();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    stopAutoScroll();
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId && currentUser) {
      const deal = state.deals.find(d => d.id === dealId);
      if (!deal) return;
      
      const order = ['opportunity', 'lead', 'discovery_proposal', 'contracting', 'onboarding', 'farming', 'lost'];
      const currentIdx = order.indexOf(deal.stage);
      const targetIdx = order.indexOf(stage);
      const isForwardMove = targetIdx > currentIdx && stage !== 'lost';

      if (isForwardMove) {

        if (deal.stage === 'opportunity') {
          if (!deal.hunterId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingHunter') });
            return;
          }

          const company = state.companies.find(c => c.id === deal.companyId);
          if (!company?.companyId || company.companyId.trim() === '') {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingIco') });
            return;
          }

          const hasRelevantActivity = state.activities.some(
            (a: any) => a.dealId === deal.id && ['call', 'teams', 'meeting'].includes(a.type) && new Date(a.date) <= new Date()
          );
          if (!hasRelevantActivity) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingActivity') });
            return;
          }
        }

        if (deal.stage === 'lead') {
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
        if (deal.stage === 'contracting') {
          if (!deal.closerId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingCloser') });
            return;
          }
        }
        if (deal.stage === 'onboarding') {
          if (!deal.farmerId) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingFarmer') });
            return;
          }
          if (!deal.itIntegrationCompletedDate || !deal.firstStockingDateActual || !deal.integrationTestingCompletedDate) {
            setAlertInfo({ isOpen: true, message: t('errors.kanban.missingOnboardingAttributes', 'Před přesunem do fáze Farming musíte vyplnit data IT integrace a 1. naskladnění.') });
            return;
          }
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

    if (deal.stage === 'lost') {
      const field = getAssigneeField(deal.stage, deal);
      if (field === 'hunterId') return currentUser.role === 'hunter';
      if (field === 'closerId') return currentUser.role === 'closer';
      if (field === 'farmerId') return currentUser.role === 'farmer';
    }

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

  const canFilterUsers = currentUser?.role === 'administrator' || currentUser?.role === 'cso' || getSubordinateIds(users, currentUser?.id || '').length > 0;
  const hasActiveFilters = Boolean(
    state.kanbanCompanySearch ||
    state.kanbanCountryFilter.length > 0 ||
    state.kanbanSegmentFilter.length > 0 ||
    state.kanbanUserFilter
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold text-gray-800">{t('menu.board')}</h2>
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">-</button>
            <span className="text-xs font-medium w-10 text-center text-gray-700">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">+</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-4">
            <input 
              type="checkbox" 
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            {t('common.unassignedDeals', 'Nepřiřazené příležitosti')}
          </label>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Kanban className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
              {t('common.list', 'List')}
            </button>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
          >
            {t('menu.newDeal')}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-2 border-r border-gray-200">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t('common.filters', 'Filtry')}</span>
        </div>

        {/* Fulltext Company Search */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('kanban.searchCompanyPlaceholder', 'Hledat společnost...')}
            value={state.kanbanCompanySearch}
            onChange={(e) => state.setKanbanCompanySearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
          />
          {state.kanbanCompanySearch && (
            <button 
              onClick={() => state.setKanbanCompanySearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Multi-option Country */}
        <MultiSelectPopover
          label={t('fields.country', 'Země')}
          icon={Globe}
          options={countryOptions}
          selectedValues={state.kanbanCountryFilter}
          onChange={state.setKanbanCountryFilter}
        />

        {/* Multi-option Segment */}
        <MultiSelectPopover
          label={t('fields.segment', 'Segment')}
          icon={Tag}
          options={segmentOptions}
          selectedValues={state.kanbanSegmentFilter}
          onChange={state.setKanbanSegmentFilter}
        />

        {/* User Filter */}
        {canFilterUsers && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <select
              value={state.kanbanUserFilter || ''}
              onChange={(e) => state.setKanbanUserFilter(e.target.value || null)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-w-[180px]"
            >
              <option value="">{t('common.allUsers', 'Všichni uživatelé')}</option>
              {users.filter(u => u.isActive).map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            onClick={state.resetKanbanFilters}
            className="text-xs text-red-600 hover:text-red-800 font-medium ml-auto flex items-center gap-1 hover:underline px-2 py-1"
          >
            <X className="w-3.5 h-3.5" />
            {t('common.clearFilters', 'Vymazat filtry')}
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-hidden">
          <DealsListView showUnassignedOnly={showUnassignedOnly} />
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div 
            ref={topScrollRef} 
            className="overflow-x-auto overflow-y-hidden shrink-0 custom-scrollbar pb-1"
            onScroll={handleTopScroll}
          >
            <div style={{ width: boardScrollWidth, height: 1 }}></div>
          </div>
          <div 
            ref={scrollContainerRef}
            onDragOver={handleContainerDragOver}
            onDragLeave={stopAutoScroll}
            onScroll={handleBottomScroll}
            className="overflow-x-auto pb-4 flex-1 mt-1 custom-scrollbar"
          >
            <div 
              className="flex gap-6 items-start h-full w-max"
          style={{ zoom: zoomLevel } as any}
        >
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
                      onDragEnd={handleDragEnd}
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
                          <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {company.urls && company.urls.filter(u => u && u.trim() !== '').length > 0 ? (
                              <a
                                href={
                                  company.urls.find(u => u && u.trim() !== '')?.startsWith('http')
                                    ? company.urls.find(u => u && u.trim() !== '')
                                    : `https://${company.urls.find(u => u && u.trim() !== '')}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline truncate"
                                title={company.urls.filter(u => u && u.trim() !== '').join(', ')}
                              >
                                {company.urls.find(u => u && u.trim() !== '')}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">{t('common.noUrl', 'Bez URL')}</span>
                            )}
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
                            {state.segments.find(s => s.id === company.segment)?.name || company.segment}
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
                                
                                // Ošetření případu, kdy někdo jiný příležitost převzal mezitím
                                const checkAssign = async () => {
                                  try {
                                    const checkRes = await fetch(`/api/deals/${deal.id}/assign`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                                        'X-Client-Id': localStorage.getItem('client_id') || ''
                                      },
                                      body: JSON.stringify({ field: getAssigneeField(deal.stage, deal), newUserId: currentUser!.id })
                                    });
                                    if (!checkRes.ok) {
                                      const errorData = await checkRes.json();
                                      alert(errorData.error || 'Neznámá chyba při převzetí');
                                      state.refreshState();
                                      return;
                                    }
                                    
                                    const willAdvanceToDiscovery = 
                                      deal.stage === 'lead' &&
                                      deal.leadSourceId &&
                                      deal.ecommercePlatformId &&
                                      deal.estimatedMonthlyParcels &&
                                      deal.estimatedMonthlyParcels > 0;
                                      
                                    const willAdvanceToContracting = deal.stage === 'discovery_proposal' &&
                                      deal.deliveryCountries && deal.deliveryCountries.length > 0 &&
                                      deal.averageItemsPerOrder && deal.averageItemsPerOrder > 0 &&
                                      deal.averageParcelWeight && deal.averageParcelWeight > 0 &&
                                      deal.averageParcelVolume && deal.averageParcelVolume > 0 &&
                                      deal.pricingOffers && deal.pricingOffers.length > 0;

                                    const willAdvanceToOnboarding = deal.stage === 'contracting' &&
                                      deal.contractSignedDate &&
                                      deal.pricingUploadedDate &&
                                      deal.itIntegrationId &&
                                      deal.firstStockingDate;
                                      
                                    const willAdvanceInfo = willAdvanceToDiscovery ? { stage: 'discovery_proposal', name: t('stages.discovery_proposal') }
                                      : willAdvanceToContracting ? { stage: 'contracting', name: t('stages.contracting') }
                                      : willAdvanceToOnboarding ? { stage: 'onboarding', name: t('stages.onboarding') }
                                      : null;

                                    if (willAdvanceInfo) {
                                      if (!window.confirm(`Převzetím bude příležitost automaticky posunuta do fáze ${willAdvanceInfo.name}. Chcete pokračovat?`)) {
                                        return;
                                      }
                                    }
                                    
                                    const updates: Partial<Deal> = { [getAssigneeField(deal.stage, deal)]: currentUser!.id };
                                    if (willAdvanceInfo) {
                                      updates.stage = willAdvanceInfo.stage as Stage;
                                    }
                                    state.updateDeal(deal.id, updates, currentUser!.id);
                                  } catch (err) {
                                    alert('Chyba komunikace se serverem.');
                                  }
                                };
                                checkAssign();
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
          </div>
        </div>
      )}

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
