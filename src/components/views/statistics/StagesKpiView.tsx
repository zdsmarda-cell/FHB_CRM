import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  GitCommit, 
  Clock, 
  TrendingUp, 
  Package, 
  Filter, 
  RotateCcw, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  UserCheck, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  BarChart2
} from 'lucide-react';
import { useStore } from '../../../store';
import { Stage, Deal } from '../../../types';
import { 
  isTestDeal, 
  getUserStatisticsScope, 
  formatDaysAndHours 
} from '../../../lib/statistics';
import { format, subDays, startOfMonth } from 'date-fns';

export interface StageDefinition {
  id: Stage;
  order: number;
  labelKey: string;
  defaultLabelCs: string;
  defaultLabelEn: string;
  descriptionCs: string;
  descriptionEn: string;
  nextStageId?: Stage;
  badgeClass: string;
  bgLightClass: string;
  borderClass: string;
  textColorClass: string;
  isTerminal?: boolean;
}

export const STAGES_CONFIG: StageDefinition[] = [
  {
    id: 'opportunity',
    order: 1,
    labelKey: 'stages.opportunity',
    defaultLabelCs: 'Příležitost',
    defaultLabelEn: 'Opportunity',
    descriptionCs: 'Nově identifikovaná obchodní příležitost',
    descriptionEn: 'Newly identified sales opportunity',
    nextStageId: 'lead',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    bgLightClass: 'bg-blue-50/50',
    borderClass: 'border-blue-200',
    textColorClass: 'text-blue-700'
  },
  {
    id: 'lead',
    order: 2,
    labelKey: 'stages.lead',
    defaultLabelCs: 'Lead',
    defaultLabelEn: 'Lead',
    descriptionCs: 'Kvalifikovaný kontakt s potvrzeným zájmem',
    descriptionEn: 'Qualified contact with confirmed interest',
    nextStageId: 'discovery_proposal',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bgLightClass: 'bg-indigo-50/50',
    borderClass: 'border-indigo-200',
    textColorClass: 'text-indigo-700'
  },
  {
    id: 'discovery_proposal',
    order: 3,
    labelKey: 'stages.discovery_proposal',
    defaultLabelCs: 'Discovery / Nabídka',
    defaultLabelEn: 'Discovery / Proposal',
    descriptionCs: 'Analýza potřeb a příprava cenové nabídky',
    descriptionEn: 'Needs discovery and pricing proposal',
    nextStageId: 'contracting',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    bgLightClass: 'bg-purple-50/50',
    borderClass: 'border-purple-200',
    textColorClass: 'text-purple-700'
  },
  {
    id: 'contracting',
    order: 4,
    labelKey: 'stages.contracting',
    defaultLabelCs: 'Zasmluvnění',
    defaultLabelEn: 'Contracting',
    descriptionCs: 'Vyjednávání a podpis smlouvy',
    descriptionEn: 'Contract negotiation and signing',
    nextStageId: 'onboarding',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    bgLightClass: 'bg-amber-50/50',
    borderClass: 'border-amber-200',
    textColorClass: 'text-amber-700'
  },
  {
    id: 'onboarding',
    order: 5,
    labelKey: 'stages.onboarding',
    defaultLabelCs: 'Onboarding',
    defaultLabelEn: 'Onboarding',
    descriptionCs: 'IT integrace a příprava prvního naskladnění',
    descriptionEn: 'IT integration and 1st stocking preparation',
    nextStageId: 'farming',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    bgLightClass: 'bg-cyan-50/50',
    borderClass: 'border-cyan-200',
    textColorClass: 'text-cyan-700'
  },
  {
    id: 'farming',
    order: 6,
    labelKey: 'stages.farming',
    defaultLabelCs: 'Farming (Vyhráno)',
    defaultLabelEn: 'Farming (Won)',
    descriptionCs: 'Aktivní péče o klienta a realizace zásilek',
    descriptionEn: 'Active client retention and ongoing fulfillment',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgLightClass: 'bg-emerald-50/50',
    borderClass: 'border-emerald-200',
    textColorClass: 'text-emerald-700',
    isTerminal: true
  },
  {
    id: 'lost',
    order: 7,
    labelKey: 'stages.lost',
    defaultLabelCs: 'Ztraceno (Lost)',
    defaultLabelEn: 'Lost',
    descriptionCs: 'Ukončené příležitosti bez realizace',
    descriptionEn: 'Closed unachieved opportunities',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    bgLightClass: 'bg-rose-50/50',
    borderClass: 'border-rose-200',
    textColorClass: 'text-rose-700',
    isTerminal: true
  }
];

export function StagesKpiView() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const { deals, users, companies, auditLogs, currentUser, segments } = store;

  // RBAC Scope
  const scope = useMemo(() => {
    return getUserStatisticsScope(currentUser, users);
  }, [currentUser, users]);

  // Base accessible deals
  const accessibleDeals = useMemo(() => {
    return deals.filter(deal => {
      // Exclude test deals
      if (isTestDeal(deal, store)) return false;

      // Admin & CSO see all deals
      if (scope.isAll) return true;

      // Filter by user scope
      const matchesScope =
        (deal.createdBy && scope.allowedUserIds.includes(deal.createdBy)) ||
        (deal.hunterId && scope.allowedUserIds.includes(deal.hunterId)) ||
        (deal.closerId && scope.allowedUserIds.includes(deal.closerId)) ||
        (deal.farmerId && scope.allowedUserIds.includes(deal.farmerId)) ||
        (deal.lostBy && scope.allowedUserIds.includes(deal.lostBy));

      return !!matchesScope;
    });
  }, [deals, store, scope]);

  // Filters State
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected stage for drill-down view
  const [expandedStageId, setExpandedStageId] = useState<Stage | null>(null);

  // Available unique countries and regions
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach(c => {
      if (c.country && c.country.trim()) set.add(c.country.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    companies.forEach(c => {
      if (c.region && c.region.trim()) set.add(c.region.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  // Quick period presets
  const handleQuickPeriod = (preset: 'all' | '12m' | '30d' | 'thisMonth' | 'thisYear') => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === '12m') {
      const past = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      setDateFrom(format(past, 'yyyy-MM-dd'));
      setDateTo(todayStr);
    } else if (preset === '30d') {
      setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd'));
      setDateTo(todayStr);
    } else if (preset === 'thisMonth') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(todayStr);
    } else if (preset === 'thisYear') {
      setDateFrom(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
      setDateTo(todayStr);
    }
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedRole('all');
    setSelectedUserId(scope.isRegular ? (currentUser?.id || 'all') : 'all');
    setSelectedCountry('all');
    setSelectedRegion('all');
    setSelectedSegment('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    dateFrom !== '' ||
    dateTo !== '' ||
    selectedRole !== 'all' ||
    (selectedUserId !== 'all' && !scope.isRegular) ||
    selectedCountry !== 'all' ||
    selectedRegion !== 'all' ||
    selectedSegment !== 'all' ||
    searchQuery.trim() !== '';

  // Filter deals based on criteria
  const filteredDeals = useMemo(() => {
    return accessibleDeals.filter(deal => {
      const company = companies.find(c => c.id === deal.companyId);

      // Date range filter (by creation date)
      if (deal.createdAt) {
        const dStr = deal.createdAt.substring(0, 10);
        if (dateFrom && dStr < dateFrom) return false;
        if (dateTo && dStr > dateTo) return false;
      } else {
        if (dateFrom) return false;
      }

      // Role filter
      if (selectedRole !== 'all') {
        const creator = users.find(u => u.id === deal.createdBy);
        const hunter = users.find(u => u.id === deal.hunterId);
        const closer = users.find(u => u.id === deal.closerId);
        const farmer = users.find(u => u.id === deal.farmerId);
        const lostBy = users.find(u => u.id === deal.lostBy);
        const matchesRole =
          creator?.role === selectedRole ||
          hunter?.role === selectedRole ||
          closer?.role === selectedRole ||
          farmer?.role === selectedRole ||
          lostBy?.role === selectedRole;
        if (!matchesRole) return false;
      }

      // User filter (Role-Aware)
      const effectiveUserId = scope.isRegular ? currentUser?.id : selectedUserId;
      if (effectiveUserId && effectiveUserId !== 'all') {
        const matchesUser =
          deal.createdBy === effectiveUserId ||
          deal.hunterId === effectiveUserId ||
          deal.closerId === effectiveUserId ||
          deal.farmerId === effectiveUserId ||
          deal.lostBy === effectiveUserId;
        if (!matchesUser) return false;
      }

      // Country filter
      if (selectedCountry !== 'all') {
        const country = company?.country || 'Czechia';
        if (country.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      }

      // Region filter
      if (selectedRegion !== 'all') {
        if (company?.region !== selectedRegion) return false;
      }

      // Segment filter
      if (selectedSegment !== 'all') {
        if (company?.segment !== selectedSegment) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const companyName = (company?.name || '').toLowerCase();
        const ico = (company?.companyId || '').toLowerCase();
        const creatorName = (users.find(u => u.id === deal.createdBy)?.name || '').toLowerCase();
        const hunterName = (users.find(u => u.id === deal.hunterId)?.name || '').toLowerCase();
        const closerName = (users.find(u => u.id === deal.closerId)?.name || '').toLowerCase();

        if (
          !companyName.includes(q) &&
          !ico.includes(q) &&
          !creatorName.includes(q) &&
          !hunterName.includes(q) &&
          !closerName.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    accessibleDeals,
    companies,
    users,
    dateFrom,
    dateTo,
    selectedRole,
    selectedUserId,
    selectedCountry,
    selectedRegion,
    selectedSegment,
    searchQuery,
    scope,
    currentUser
  ]);

  const filteredDealIdsSet = useMemo(() => {
    return new Set(filteredDeals.map(d => d.id));
  }, [filteredDeals]);

  // Pre-group stage transition audit logs by dealId
  const dealStageLogs = useMemo(() => {
    const map = new Map<string, typeof auditLogs>();
    auditLogs.forEach(log => {
      if (log.dealId && filteredDealIdsSet.has(log.dealId) && log.field === 'stage') {
        const arr = map.get(log.dealId) || [];
        arr.push(log);
        map.set(log.dealId, arr);
      }
    });

    // Sort chronologically
    map.forEach(logs => {
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    return map;
  }, [auditLogs, filteredDealIdsSet]);

  // Stage order index map for progression calculation
  const stageOrderMap: Record<Stage, number> = {
    opportunity: 1,
    lead: 2,
    discovery_proposal: 3,
    contracting: 4,
    onboarding: 5,
    farming: 6,
    lost: 99
  };

  // Compute Stage Metrics
  const stageMetrics = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const totalActiveDeals = filteredDeals.filter(d => d.stage !== 'lost').length;

    return STAGES_CONFIG.map(cfg => {
      const stageId = cfg.id;
      const nextStageId = cfg.nextStageId;

      // 1. Deals currently in this stage
      const currentDeals = filteredDeals.filter(d => d.stage === stageId);
      const currentCount = currentDeals.length;
      const currentParcels = currentDeals.reduce((sum, d) => sum + (d.estimatedYearlyParcels || 0), 0);

      // Percentage of current stage relative to total or active
      const currentSharePercent = totalDeals > 0 
        ? Math.round((currentCount / totalDeals) * 1000) / 10 
        : 0;

      // 2. Deals that have EVER entered this stage
      // A deal has entered stageId if:
      // - It was created in stageId (or opportunity is initial stage for all deals)
      // - An audit log has newValue === stageId
      // - Deal is currently in this stage or later in pipeline
      const enteredDeals: Deal[] = [];
      const progressedDeals: Deal[] = [];
      const lostFromThisStageDeals: Deal[] = [];

      // For calculating average dwell time before changing stage
      const dwellTimesMs: number[] = [];

      filteredDeals.forEach(deal => {
        const logs = dealStageLogs.get(deal.id) || [];

        // Check if deal entered this stage
        let entered = false;
        let enterTimestamp: number = NaN;

        if (stageId === 'opportunity') {
          // Opportunity is initial stage for all deals
          entered = true;
          if (deal.createdAt) {
            enterTimestamp = new Date(deal.createdAt).getTime();
          }
        } else if (deal.stage === stageId) {
          entered = true;
        }

        // Search logs for entry into this stage
        logs.forEach(log => {
          if (log.newValue === stageId) {
            entered = true;
            const t = new Date(log.timestamp).getTime();
            if (isNaN(enterTimestamp) || t < enterTimestamp) {
              enterTimestamp = t;
            }
          }
        });

        // If deal is in a later pipeline stage, it definitely entered this stage
        const dealStageOrder = stageOrderMap[deal.stage];
        const thisStageOrder = stageOrderMap[stageId];
        if (deal.stage !== 'lost' && dealStageOrder >= thisStageOrder) {
          entered = true;
        }

        if (entered) {
          enteredDeals.push(deal);

          // 3. Did it progress to the next stage (or further)?
          if (nextStageId) {
            let progressed = false;

            // If current stage is already at or beyond nextStage
            if (deal.stage !== 'lost' && dealStageOrder > thisStageOrder) {
              progressed = true;
            } else {
              // Check if any audit log transitioned into nextStage or higher
              const nextStageOrder = stageOrderMap[nextStageId];
              logs.forEach(log => {
                const loggedOrder = stageOrderMap[log.newValue as Stage] || 0;
                if (loggedOrder >= nextStageOrder && log.newValue !== 'lost') {
                  progressed = true;
                }
              });
            }

            if (progressed) {
              progressedDeals.push(deal);
            }
          }

          // 4. Was it lost directly from this stage?
          if (deal.stage === 'lost') {
            const isLostFromHere =
              deal.lostFromStage === stageId ||
              (!deal.lostFromStage && logs.length > 0 && logs[logs.length - 1].oldValue === stageId);
            if (isLostFromHere) {
              lostFromThisStageDeals.push(deal);
            }
          }

          // 5. Transition time: time spent in this stage before transitioning out
          // Find audit logs transitioning out: oldValue === stageId && newValue !== stageId
          logs.forEach(log => {
            if (log.oldValue === stageId && log.newValue !== stageId) {
              const exitTime = new Date(log.timestamp).getTime();
              // If we have an entry time before this exit
              if (!isNaN(enterTimestamp) && exitTime > enterTimestamp) {
                const duration = exitTime - enterTimestamp;
                if (duration > 0 && duration < 365 * 24 * 3600 * 1000) {
                  dwellTimesMs.push(duration);
                }
              }
            }
          });
        }
      });

      const enteredCount = enteredDeals.length;
      const progressedCount = progressedDeals.length;
      const lostCount = lostFromThisStageDeals.length;

      // Conversion rate to next stage:
      // For pipeline stages: progressed / entered * 100
      // For farming: terminal won (100% or achieved)
      // For lost: drop-off rate
      let conversionRatePercent: number | null = null;
      if (stageId === 'farming') {
        conversionRatePercent = 100;
      } else if (stageId === 'lost') {
        conversionRatePercent = totalDeals > 0 
          ? Math.round((currentCount / totalDeals) * 1000) / 10 
          : 0;
      } else if (enteredCount > 0) {
        conversionRatePercent = Math.round((progressedCount / enteredCount) * 1000) / 10;
      }

      // Average transition time
      let avgTransitionTimeMs: number | null = null;
      let avgTransitionTimeFormatted = '–';

      if (dwellTimesMs.length > 0) {
        const sum = dwellTimesMs.reduce((a, b) => a + b, 0);
        avgTransitionTimeMs = Math.round(sum / dwellTimesMs.length);
        avgTransitionTimeFormatted = formatDaysAndHours(avgTransitionTimeMs, t);
      } else if (stageId === 'lost') {
        // For lost deals: average time from creation to loss
        const lostDurations: number[] = [];
        currentDeals.forEach(d => {
          if (d.createdAt && (d.lostAt || d.updatedAt)) {
            const start = new Date(d.createdAt).getTime();
            const end = new Date(d.lostAt || d.updatedAt).getTime();
            if (end > start) lostDurations.push(end - start);
          }
        });
        if (lostDurations.length > 0) {
          const sum = lostDurations.reduce((a, b) => a + b, 0);
          avgTransitionTimeMs = Math.round(sum / lostDurations.length);
          avgTransitionTimeFormatted = formatDaysAndHours(avgTransitionTimeMs, t);
        }
      }

      return {
        ...cfg,
        currentCount,
        currentSharePercent,
        currentParcels,
        enteredCount,
        progressedCount,
        conversionRatePercent,
        lostCount,
        lostPercent: enteredCount > 0 ? Math.round((lostCount / enteredCount) * 1000) / 10 : 0,
        avgTransitionTimeMs,
        avgTransitionTimeFormatted,
        dwellCount: dwellTimesMs.length,
        currentDeals
      };
    });
  }, [filteredDeals, dealStageLogs, t]);

  // Overall Summary Metrics
  const summaryKpis = useMemo(() => {
    const totalCount = filteredDeals.length;
    const activeDeals = filteredDeals.filter(d => d.stage !== 'lost');
    const activeCount = activeDeals.length;
    const totalParcelsYearly = activeDeals.reduce((sum, d) => sum + (d.estimatedYearlyParcels || 0), 0);

    // Farming / Won count
    const farmingCount = filteredDeals.filter(d => d.stage === 'farming').length;
    const overallWinRate = totalCount > 0 ? Math.round((farmingCount / totalCount) * 1000) / 10 : 0;

    // Average cycle time from creation to farming/contracting
    const cycleDurations: number[] = [];
    filteredDeals.forEach(deal => {
      if ((deal.stage === 'contracting' || deal.stage === 'onboarding' || deal.stage === 'farming') && deal.createdAt) {
        const start = new Date(deal.createdAt).getTime();
        // Check contract signed date or latest update
        const end = deal.contractSignedDate 
          ? new Date(deal.contractSignedDate).getTime()
          : deal.updatedAt 
          ? new Date(deal.updatedAt).getTime()
          : NaN;
        if (!isNaN(end) && end > start) {
          cycleDurations.push(end - start);
        }
      }
    });

    const avgCycleMs = cycleDurations.length > 0 
      ? Math.round(cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length) 
      : 0;

    return {
      totalCount,
      activeCount,
      totalParcelsYearly,
      overallWinRate,
      avgCycleTimeFormatted: avgCycleMs > 0 ? formatDaysAndHours(avgCycleMs, t) : '–'
    };
  }, [filteredDeals, t]);

  // Toggle stage expansion for drill-down
  const handleToggleStage = (stageId: Stage) => {
    setExpandedStageId(prev => (prev === stageId ? null : stageId));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-indigo-600" />
            {t('statistics.stages.title', 'Stavy a fáze obchodního procesu')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('statistics.stages.subtitle', 'Kompletní přehled stavů pipeline, konverzních poměrů mezi jednotlivými fázemi a průměrné doby setrvání')}
          </p>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Aktivní příležitosti v pipeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.stages.summary.activeDeals', 'Aktivní v pipeline')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-mono">
              {summaryKpis.activeCount}
            </span>
            <span className="text-xs text-gray-500">
              / {summaryKpis.totalCount} {t('statistics.table.dealsCount', 'celkem')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {t('statistics.stages.summary.activeDealsDesc', 'Příležitosti ve fázích Opportunity až Farming')}
          </p>
        </div>

        {/* 2. Roční objem balíků */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.stages.summary.pipelineVolume', 'Objem balíků v pipeline')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-mono">
              {summaryKpis.totalParcelsYearly.toLocaleString(i18n.language === 'en' ? 'en-US' : 'cs-CZ')}
            </span>
            <span className="text-xs text-gray-500 font-medium">ks / rok</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {t('statistics.stages.summary.pipelineVolumeDesc', 'Odhadovaný roční potenciál aktivních obchodů')}
          </p>
        </div>

        {/* 3. Průměrná celková doba cyklu */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.stages.summary.avgCycleTime', 'Prům. doba obchodního cyklu')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              {summaryKpis.avgCycleTimeFormatted}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {t('statistics.stages.summary.avgCycleTimeDesc', 'Od vzniku příležitosti po zasmluvnění')}
          </p>
        </div>

        {/* 4. Celková úspěšnost trychtýře */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.stages.summary.winRate', 'Úspěšnost pipeline (Won)')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 tracking-tight font-mono">
              {summaryKpis.overallWinRate} %
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {t('statistics.stages.summary.winRateDesc', 'Podíl obchodů, které dosáhly fáze Farming')}
          </p>
        </div>
      </div>

      {/* Dynamic Filter Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>{t('statistics.filters.title', 'Filtry')}</span>
            {hasActiveFilters && (
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t('statistics.filters.active', 'Aktivní')}
              </span>
            )}
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium mr-1">
              {t('statistics.filters.quickPeriod', 'Rychlý výběr období:')}
            </span>
            <button
              type="button"
              onClick={() => handleQuickPeriod('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                !dateFrom && !dateTo
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('statistics.filters.allTime', 'Od začátku')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod('12m')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.last12Months', '12 měsíců')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod('30d')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              30 dní
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod('thisMonth')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.thisMonth', 'Tento měsíc')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod('thisYear')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.thisYear', 'Tento rok')}
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.periodFrom', 'Datum od')}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.periodTo', 'Datum do')}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.users.filters.roles', 'Role')}
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              disabled={scope.isRegular}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="all">{t('statistics.users.filters.allRoles', 'Všechny role')}</option>
              <option value="hunter">{t('roles.hunter', 'Hunter')}</option>
              <option value="closer">{t('roles.closer', 'Closer')}</option>
              <option value="farmer">{t('roles.farmer', 'Farmer')}</option>
              <option value="cso">{t('roles.cso', 'CSO')}</option>
              <option value="administrator">{t('roles.administrator', 'Administrátor')}</option>
            </select>
          </div>

          {/* User Filter (Role-Aware) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.user', 'Uživatel')}
            </label>
            <select
              value={scope.isRegular ? (currentUser?.id || '') : selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              disabled={scope.isRegular}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden truncate disabled:bg-gray-100 disabled:text-gray-400"
            >
              {scope.isAll && (
                <option value="all">{t('statistics.filters.allUsers', 'Všichni uživatelé')}</option>
              )}
              {scope.isManager && (
                <option value="all">{t('statistics.filters.mySubordinates', 'Můj tým a podřízení')}</option>
              )}
              {scope.isRegular && (
                <option value={currentUser?.id}>
                  {currentUser?.name} ({t('statistics.filters.onlyMyData', 'Pouze moje data')})
                </option>
              )}
              {!scope.isRegular &&
                scope.accessibleUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.country', 'Země')}
            </label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            >
              <option value="all">{t('statistics.filters.allCountries', 'Všechny země')}</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.region', 'Region')}
            </label>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            >
              <option value="all">{t('statistics.filters.allRegions', 'Všechny regiony')}</option>
              {availableRegions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Segment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.segment', 'Segment')}
            </label>
            <select
              value={selectedSegment}
              onChange={e => setSelectedSegment(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden truncate"
            >
              <option value="all">{t('statistics.filters.allSegments', 'Všechny segmenty')}</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Search Query & Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-gray-50">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('statistics.stages.searchPlaceholder', 'Hledat společnost, IČ, obchodníka...')}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors font-medium px-2 py-1 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('statistics.filters.reset', 'Resetovat filtry')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stages Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {t('statistics.stages.tableTitle', 'Přehled stavů, počtů, konverzí a doby zpracování')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('statistics.stages.tableSubtitle', 'Kliknutím na řádek zobrazíte detailní seznam příležitostí aktuálně se nacházejících v daném stavu')}
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
            {stageMetrics.length} {t('statistics.stages.stagesCount', 'stavů')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/75 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">{t('statistics.stages.colStage', 'Stav / Fáze')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colActiveDeals', 'Aktivní v tomto stavu')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colYearlyParcels', 'Objem balíků (ks/rok)')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colEntered', 'Historicky prošlo')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colConversion', 'Konverze do dalšího stavu')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colAvgTransitionTime', 'Průměrná doba pro změnu stavu')}</th>
                <th className="px-4 py-3 text-right">{t('statistics.stages.colLostFromStage', 'Odpad do Lost')}</th>
                <th className="px-4 py-3 text-center w-12">{t('common.view', 'Detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stageMetrics.map(stage => {
                const isExpanded = expandedStageId === stage.id;
                const localizedName = t(stage.labelKey, i18n.language === 'en' ? stage.defaultLabelEn : stage.defaultLabelCs);
                const localizedDesc = i18n.language === 'en' ? stage.descriptionEn : stage.descriptionCs;

                return (
                  <React.Fragment key={stage.id}>
                    <tr 
                      onClick={() => handleToggleStage(stage.id)}
                      className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-indigo-50/60 font-medium' : ''
                      }`}
                    >
                      {/* 1. Order */}
                      <td className="px-4 py-3.5 text-center text-gray-400 font-mono font-bold">
                        {stage.order}
                      </td>

                      {/* 2. Stage Name & Badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${stage.badgeClass}`}>
                            {localizedName}
                          </span>
                          <span className="text-[11px] text-gray-400 hidden sm:inline truncate max-w-xs">
                            {localizedDesc}
                          </span>
                        </div>
                      </td>

                      {/* 3. Active Deals in Stage */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <div className="font-bold text-gray-900 text-sm">
                          {stage.currentCount}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {stage.currentSharePercent} % {t('statistics.stages.ofTotal', 'z celku')}
                        </div>
                      </td>

                      {/* 4. Yearly Parcels Volume */}
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-gray-800">
                        {stage.currentParcels > 0 ? (
                          <span>
                            {stage.currentParcels.toLocaleString(i18n.language === 'en' ? 'en-US' : 'cs-CZ')}{' '}
                            <span className="text-[10px] text-gray-400 font-normal">ks</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>

                      {/* 5. Historically Entered */}
                      <td className="px-4 py-3.5 text-right font-mono text-gray-700">
                        <span className="font-semibold">{stage.enteredCount}</span>
                      </td>

                      {/* 6. Conversion Rate to Next Stage */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        {stage.id === 'farming' ? (
                          <div className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>100 % (Cíl)</span>
                          </div>
                        ) : stage.id === 'lost' ? (
                          <div className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>{stage.conversionRatePercent} % {t('statistics.stages.lostRate', 'ztrátovost')}</span>
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1 font-bold text-gray-900">
                              <span>{stage.conversionRatePercent ?? 0} %</span>
                              {stage.nextStageId && (
                                <ArrowRight className="w-3 h-3 text-gray-400 inline" />
                              )}
                            </div>
                            <div className="w-20 ml-auto bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, stage.conversionRatePercent || 0)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Avg Transition Time Between Stages */}
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                        {stage.avgTransitionTimeFormatted !== '–' ? (
                          <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-mono text-gray-800">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{stage.avgTransitionTimeFormatted}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>

                      {/* 8. Lost from this stage */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        {stage.id === 'lost' ? (
                          <span className="text-gray-400">–</span>
                        ) : stage.lostCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                            <span>{stage.lostCount}×</span>
                            <span className="text-[10px] text-rose-400">({stage.lostPercent} %)</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>

                      {/* 9. Expand / Collapse Icon */}
                      <td className="px-4 py-3.5 text-center text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600 inline" />
                        ) : (
                          <ChevronRight className="w-4 h-4 hover:text-gray-600 inline" />
                        )}
                      </td>
                    </tr>

                    {/* Drill-down: List of deals currently in this stage */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-gray-50 border-b border-indigo-100">
                          <div className="p-4 pl-12 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700">
                                  {t('statistics.stages.activeDealsInStage', 'Příležitosti ve stavu')}:
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${stage.badgeClass}`}>
                                  {localizedName}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  ({stage.currentDeals.length})
                                </span>
                              </div>
                            </div>

                            {stage.currentDeals.length === 0 ? (
                              <div className="py-6 text-center text-gray-400 text-xs italic">
                                {t('statistics.stages.noDealsInStage', 'V tomto stavu se ve vybraném filtru nenachází žádná příležitost.')}
                              </div>
                            ) : (
                              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-gray-100/60 border-b border-gray-200 text-gray-500 font-medium">
                                    <tr>
                                      <th className="px-3 py-2">{t('statistics.table.companyName', 'Společnost')}</th>
                                      <th className="px-3 py-2">{t('statistics.table.ico', 'IČ')}</th>
                                      <th className="px-3 py-2">{t('statistics.table.assignedTo', 'Přiřazený obchodník')}</th>
                                      <th className="px-3 py-2 text-right">{t('deal.attributes.estimatedYearlyParcels', 'Odhad balíků')}</th>
                                      <th className="px-3 py-2 text-right">{t('statistics.table.createdAt', 'Vloženo')}</th>
                                      <th className="px-3 py-2 text-right">{t('statistics.stages.daysInStage', 'Doba v CRM')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {stage.currentDeals.map(deal => {
                                      const company = companies.find(c => c.id === deal.companyId);
                                      const hunter = users.find(u => u.id === deal.hunterId);
                                      const closer = users.find(u => u.id === deal.closerId);
                                      const farmer = users.find(u => u.id === deal.farmerId);
                                      const assignedName = hunter?.name || closer?.name || farmer?.name || t('common.unknownUser', 'Nepřiřazeno');

                                      // Time in CRM
                                      let daysInCrm = '–';
                                      if (deal.createdAt) {
                                        const createdTime = new Date(deal.createdAt).getTime();
                                        const nowTime = new Date().getTime();
                                        const diffMs = nowTime - createdTime;
                                        if (diffMs > 0) {
                                          daysInCrm = formatDaysAndHours(diffMs, t);
                                        }
                                      }

                                      return (
                                        <tr key={deal.id} className="hover:bg-gray-50/75">
                                          <td className="px-3 py-2 font-medium text-gray-900 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate max-w-xs">{company?.name || '–'}</span>
                                          </td>
                                          <td className="px-3 py-2 font-mono text-gray-500">
                                            {company?.companyId || '–'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-700">
                                            <div className="flex items-center gap-1">
                                              <UserCheck className="w-3 h-3 text-gray-400" />
                                              <span>{assignedName}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-gray-800">
                                            {deal.estimatedYearlyParcels 
                                              ? `${deal.estimatedYearlyParcels.toLocaleString(i18n.language === 'en' ? 'en-US' : 'cs-CZ')} ks/rok`
                                              : '–'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                                            {deal.createdAt ? format(new Date(deal.createdAt), 'dd.MM.yyyy') : '–'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-gray-600">
                                            {daysInCrm}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
