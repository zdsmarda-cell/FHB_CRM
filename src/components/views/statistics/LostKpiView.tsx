import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store';
import { Deal, Company, User, Stage } from '../../../types';
import { isTestDeal, getUserStatisticsScope, formatDaysAndHours } from '../../../lib/statistics';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import {
  Building2,
  Calendar,
  Clock,
  Filter,
  RotateCcw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Users as UsersIcon,
  XCircle,
  Package,
  AlertOctagon,
  FileText,
  User as UserIcon,
  Globe,
  Tag,
  HelpCircle
} from 'lucide-react';

export function LostKpiView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const store = useStore();
  const { deals, companies, users, segments, lostReasons, currentUser } = store;

  // RBAC scope
  const scope = useMemo(() => {
    return getUserStatisticsScope(currentUser, users);
  }, [currentUser, users]);

  // Base accessible lost deals
  const accessibleLostDeals = useMemo(() => {
    return deals.filter(deal => {
      // Must be lost
      if (deal.stage !== 'lost') return false;

      // Exclude test deals
      if (isTestDeal(deal, store)) return false;

      // RBAC check
      if (scope.isAll) return true;

      const matchesScope =
        (deal.createdBy && scope.allowedUserIds.includes(deal.createdBy)) ||
        (deal.hunterId && scope.allowedUserIds.includes(deal.hunterId)) ||
        (deal.closerId && scope.allowedUserIds.includes(deal.closerId)) ||
        (deal.farmerId && scope.allowedUserIds.includes(deal.farmerId)) ||
        (deal.lostBy && scope.allowedUserIds.includes(deal.lostBy));

      return !!matchesScope;
    });
  }, [deals, store, scope]);

  // Filter States
  const [dateType, setDateType] = useState<'lostAt' | 'createdAt'>('lostAt');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedReasonId, setSelectedReasonId] = useState<string>('all');
  const [selectedOriginalStage, setSelectedOriginalStage] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Column search filters
  const [colSearchCompany, setColSearchCompany] = useState<string>('');
  const [colSearchReason, setColSearchReason] = useState<string>('');
  const [colSearchNote, setColSearchNote] = useState<string>('');
  const [colSearchUser, setColSearchUser] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<string>('lostAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Quick period presets
  const handleQuickPeriod = (preset: 'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'thisYear') => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === '7d') {
      setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd'));
      setDateTo(todayStr);
    } else if (preset === '30d') {
      setDateFrom(format(subDays(now, 30), 'yyyy-MM-dd'));
      setDateTo(todayStr);
    } else if (preset === 'thisMonth') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'thisYear') {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(`${now.getFullYear()}-12-31`);
    }
    setCurrentPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setDateType('lostAt');
    setDateFrom('');
    setDateTo('');
    setSelectedReasonId('all');
    setSelectedOriginalStage('all');
    setSelectedRole('all');
    setSelectedUserId(scope.isRegular ? (currentUser?.id || 'all') : 'all');
    setSelectedCountry('all');
    setSelectedSegmentId('all');
    setSearchQuery('');
    setColSearchCompany('');
    setColSearchReason('');
    setColSearchNote('');
    setColSearchUser('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    dateFrom !== '' ||
    dateTo !== '' ||
    selectedReasonId !== 'all' ||
    selectedOriginalStage !== 'all' ||
    selectedRole !== 'all' ||
    (selectedUserId !== 'all' && !scope.isRegular) ||
    selectedCountry !== 'all' ||
    selectedSegmentId !== 'all' ||
    searchQuery.trim() !== '' ||
    colSearchCompany.trim() !== '' ||
    colSearchReason.trim() !== '' ||
    colSearchNote.trim() !== '' ||
    colSearchUser.trim() !== '';

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return accessibleLostDeals.filter(deal => {
      const company = companies.find(c => c.id === deal.companyId);

      // Date filtering
      const targetDateStr =
        dateType === 'lostAt'
          ? deal.lostAt || deal.updatedAt || deal.createdAt
          : deal.createdAt;

      if (targetDateStr) {
        const dStr = targetDateStr.substring(0, 10);
        if (dateFrom && dStr < dateFrom) return false;
        if (dateTo && dStr > dateTo) return false;
      } else {
        if (dateFrom) return false;
      }

      // Reason filter
      if (selectedReasonId !== 'all') {
        if (deal.lostReasonId !== selectedReasonId) return false;
      }

      // Stage before loss filter
      if (selectedOriginalStage !== 'all') {
        const prevStage = deal.lostFromStage;
        if (prevStage !== selectedOriginalStage) return false;
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

      // User filter (lostBy or assigned or createdBy)
      const effectiveUserId = scope.isRegular ? currentUser?.id : selectedUserId;
      if (effectiveUserId && effectiveUserId !== 'all') {
        const matchesUser =
          deal.lostBy === effectiveUserId ||
          deal.hunterId === effectiveUserId ||
          deal.closerId === effectiveUserId ||
          deal.farmerId === effectiveUserId ||
          deal.createdBy === effectiveUserId;
        if (!matchesUser) return false;
      }

      // Country filter
      if (selectedCountry !== 'all') {
        const dealCountry =
          deal.deliveryCountries && deal.deliveryCountries.length > 0
            ? deal.deliveryCountries[0]
            : (company as any)?.country || '';
        if (dealCountry.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      }

      // Segment filter
      if (selectedSegmentId !== 'all') {
        if (company?.segment !== selectedSegmentId) return false;
      }

      // General search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const compName = (company?.name || '').toLowerCase();
        const reasonText = (deal.lostReason || '').toLowerCase();
        const reasonObj = lostReasons.find(r => r.id === deal.lostReasonId);
        const reasonName = (reasonObj?.name || '').toLowerCase();
        const userLost = users.find(u => u.id === deal.lostBy);
        const lostByName = (userLost?.name || '').toLowerCase();

        if (
          !compName.includes(q) &&
          !reasonText.includes(q) &&
          !reasonName.includes(q) &&
          !lostByName.includes(q)
        ) {
          return false;
        }
      }

      // Column search filters
      if (colSearchCompany.trim()) {
        const q = colSearchCompany.toLowerCase();
        const compName = (company?.name || '').toLowerCase();
        if (!compName.includes(q)) return false;
      }

      if (colSearchReason.trim()) {
        const q = colSearchReason.toLowerCase();
        const reasonObj = lostReasons.find(r => r.id === deal.lostReasonId);
        const reasonName = (reasonObj?.name || '').toLowerCase();
        if (!reasonName.includes(q)) return false;
      }

      if (colSearchNote.trim()) {
        const q = colSearchNote.toLowerCase();
        const note = (deal.lostReason || '').toLowerCase();
        if (!note.includes(q)) return false;
      }

      if (colSearchUser.trim()) {
        const q = colSearchUser.toLowerCase();
        const userLost = users.find(u => u.id === deal.lostBy);
        const hunter = users.find(u => u.id === deal.hunterId);
        const closer = users.find(u => u.id === deal.closerId);
        const names = [userLost?.name, hunter?.name, closer?.name].filter(Boolean).join(' ').toLowerCase();
        if (!names.includes(q)) return false;
      }

      return true;
    });
  }, [
    accessibleLostDeals,
    companies,
    users,
    lostReasons,
    dateType,
    dateFrom,
    dateTo,
    selectedReasonId,
    selectedOriginalStage,
    selectedUserId,
    selectedCountry,
    selectedSegmentId,
    searchQuery,
    colSearchCompany,
    colSearchReason,
    colSearchNote,
    colSearchUser
  ]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalLost = filteredDeals.length;

    // Reason frequencies
    const reasonCounts: Record<string, number> = {};
    let totalDurationMs = 0;
    let durationCount = 0;
    let totalParcelsYearly = 0;

    filteredDeals.forEach(d => {
      const reasonId = d.lostReasonId || 'unspecified';
      reasonCounts[reasonId] = (reasonCounts[reasonId] || 0) + 1;

      // Duration from created to lost
      if (d.createdAt) {
        const createdMs = new Date(d.createdAt).getTime();
        const lostMs = new Date(d.lostAt || d.updatedAt || d.createdAt).getTime();
        if (!isNaN(createdMs) && !isNaN(lostMs) && lostMs >= createdMs) {
          totalDurationMs += lostMs - createdMs;
          durationCount++;
        }
      }

      // Lost parcel potential
      if (d.estimatedYearlyParcels && !isNaN(Number(d.estimatedYearlyParcels))) {
        totalParcelsYearly += Number(d.estimatedYearlyParcels);
      }
    });

    // Find top reason
    let topReasonName = '–';
    let topReasonCount = 0;
    Object.entries(reasonCounts).forEach(([rId, count]) => {
      if (count > topReasonCount) {
        topReasonCount = count;
        if (rId === 'unspecified') {
          topReasonName = t('common.unspecified', 'Neuvedeno');
        } else {
          const found = lostReasons.find(r => r.id === rId);
          topReasonName = found ? found.name : rId;
        }
      }
    });

    const avgTimeToLossMs = durationCount > 0 ? totalDurationMs / durationCount : 0;
    const avgTimeToLossFormatted = formatDaysAndHours(avgTimeToLossMs, t);

    return {
      totalLost,
      topReasonName,
      topReasonCount,
      avgTimeToLossFormatted,
      totalParcelsYearly
    };
  }, [filteredDeals, lostReasons, t]);

  // Sorting
  const sortedDeals = useMemo(() => {
    return [...filteredDeals].sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      const compA = companies.find(c => c.id === a.companyId);
      const compB = companies.find(c => c.id === b.companyId);

      switch (sortField) {
        case 'company':
          valA = compA?.name || '';
          valB = compB?.name || '';
          break;
        case 'createdAt':
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'lostAt':
          valA = a.lostAt || a.updatedAt ? new Date(a.lostAt || a.updatedAt || 0).getTime() : 0;
          valB = b.lostAt || b.updatedAt ? new Date(b.lostAt || b.updatedAt || 0).getTime() : 0;
          break;
        case 'duration': {
          const cA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const lA = new Date(a.lostAt || a.updatedAt || 0).getTime();
          valA = lA - cA;

          const cB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const lB = new Date(b.lostAt || b.updatedAt || 0).getTime();
          valB = lB - cB;
          break;
        }
        case 'reason': {
          const rA = lostReasons.find(r => r.id === a.lostReasonId);
          const rB = lostReasons.find(r => r.id === b.lostReasonId);
          valA = rA?.name || '';
          valB = rB?.name || '';
          break;
        }
        case 'lostBy': {
          const uA = users.find(u => u.id === a.lostBy);
          const uB = users.find(u => u.id === b.lostBy);
          valA = uA?.name || '';
          valB = uB?.name || '';
          break;
        }
        case 'parcels':
          valA = Number(a.estimatedYearlyParcels || 0);
          valB = Number(b.estimatedYearlyParcels || 0);
          break;
        default:
          valA = a.lostAt || a.updatedAt || '';
          valB = b.lostAt || b.updatedAt || '';
      }

      if (valA === null || valA === undefined) valA = sortOrder === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortOrder === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredDeals, companies, users, lostReasons, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedDeals.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedDeals.slice(startIndex, startIndex + pageSize);
  }, [sortedDeals, safeCurrentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Helper for stage badge
  const getStageBadge = (stage: string | undefined) => {
    if (!stage) return <span className="text-gray-400 text-xs">–</span>;

    const stageMap: Record<string, { label: string; color: string }> = {
      opportunity: { label: t('stages.opportunity', 'Příležitost'), color: 'bg-blue-50 text-blue-700 border-blue-200' },
      lead: { label: t('stages.lead', 'Lead'), color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      discovery_proposal: { label: t('stages.discovery_proposal', 'Discovery / Nabídka'), color: 'bg-purple-50 text-purple-700 border-purple-200' },
      contracting: { label: t('stages.contracting', 'Zasmluvnění'), color: 'bg-amber-50 text-amber-700 border-amber-200' },
      onboarding: { label: t('stages.onboarding', 'Onboarding'), color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      farming: { label: t('stages.farming', 'Farming'), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };

    const s = stageMap[stage] || { label: stage, color: 'bg-gray-100 text-gray-700 border-gray-200' };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  // Available countries from data
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    accessibleLostDeals.forEach(d => {
      if (d.deliveryCountries && d.deliveryCountries.length > 0) {
        d.deliveryCountries.forEach(c => set.add(c));
      }
      const c = companies.find(comp => comp.id === d.companyId);
      if ((c as any)?.country) set.add((c as any).country);
    });
    return Array.from(set).sort();
  }, [accessibleLostDeals, companies]);

  return (
    <div className="space-y-6">
      {/* Header & Scope info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-600" />
            {t('statistics.lost.title', 'Ztracené příležitosti')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('statistics.lost.subtitle', 'Komplexní přehled a analýza ztracených obchodních případů včetně vypsaných důvodů')}
          </p>
        </div>

        {/* Scope Indicator Badge */}
        <div className="flex items-center gap-2">
          {scope.isAll ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>
                {t('statistics.scope.allData', {
                  role: currentUser?.role?.toUpperCase() || 'ADMIN',
                  defaultValue: `Všechna data systému (Role: ${currentUser?.role?.toUpperCase()})`
                })}
              </span>
            </div>
          ) : scope.isManager ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>
                {t('statistics.scope.managerData', {
                  count: scope.allowedUserIds.length,
                  defaultValue: `Data týmu a podřízených (${scope.allowedUserIds.length} uživatelů)`
                })}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {t('statistics.scope.regularData', {
                  name: currentUser?.name || '',
                  defaultValue: `Pouze vaše osobní data (${currentUser?.name})`
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Celkem ztracených */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.lost.summary.totalLost', 'Ztracené příležitosti')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight font-mono">
              {kpis.totalLost}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {t('statistics.users.summary.inFilter', 've filtru')}
            </span>
          </div>
          <div className="mt-2 text-xs text-rose-700 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            <span>{accessibleLostDeals.length} {t('statistics.filters.allTime', 'celkem v systému')}</span>
          </div>
        </div>

        {/* 2. Nejčastější důvod */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.lost.summary.topReason', 'Nejčastější důvod')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-gray-900 truncate block" title={kpis.topReasonName}>
              {kpis.topReasonName}
            </span>
            <div className="mt-1 flex items-center gap-2">
              {kpis.topReasonCount > 0 && (
                <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  {kpis.topReasonCount}× ({Math.round((kpis.topReasonCount / (kpis.totalLost || 1)) * 100)} %)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Průměrná doba do ztráty */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.lost.summary.avgTimeToLoss', 'Prům. doba do ztráty')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              {kpis.avgTimeToLossFormatted}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {t('statistics.time.durationSub', 'od vzniku k označení za ztracenou')}
          </p>
        </div>

        {/* 4. Ztracený potenciál balíků */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('statistics.lost.summary.totalVolume', 'Ztracený objem balíků')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">
              {kpis.totalParcelsYearly.toLocaleString(i18n.language === 'en' ? 'en-US' : 'cs-CZ')}
            </span>
            <span className="text-xs text-gray-500 font-medium">ks / rok</span>
          </div>
          <p className="mt-2 text-xs text-purple-700 font-medium">
            odhadovaný roční potenciál
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div id="lost-filter-card" className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>{t('statistics.filters.title', 'Filtry')}</span>
            {hasActiveFilters && (
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t('statistics.filters.active', 'Aktivní')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {t('statistics.lost.filters.quickPeriodLost', 'Rychlý výběr období ztráty:')}
            </span>
            <button
              type="button"
              onClick={() => handleQuickPeriod('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                !dateFrom && !dateTo ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('statistics.filters.allTime', 'Vše')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickPeriod('7d')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              7 dní
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

        {/* Filter controls row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {/* 1. Date Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.dateType', 'Typ data')}
            </label>
            <select
              value={dateType}
              onChange={e => {
                setDateType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            >
              <option value="lostAt">{t('statistics.lost.filters.dateTypeLost', 'Datum ztráty')}</option>
              <option value="createdAt">{t('statistics.lost.filters.dateTypeCreated', 'Datum vzniku')}</option>
            </select>
          </div>

          {/* 2. Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.lostDateFrom', 'Datum od')}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* 3. Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.lostDateTo', 'Datum do')}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* 4. Loss Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.reason', 'Důvod ztráty')}
            </label>
            <select
              value={selectedReasonId}
              onChange={e => {
                setSelectedReasonId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden truncate"
            >
              <option value="all">{t('statistics.lost.filters.allReasons', 'Všechny důvody')}</option>
              {lostReasons.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Original Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.lostFromStage', 'Původní fáze')}
            </label>
            <select
              value={selectedOriginalStage}
              onChange={e => {
                setSelectedOriginalStage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            >
              <option value="all">{t('statistics.lost.filters.allStages', 'Všechny fáze')}</option>
              <option value="opportunity">{t('stages.opportunity', 'Příležitost')}</option>
              <option value="lead">{t('stages.lead', 'Lead')}</option>
              <option value="discovery_proposal">{t('stages.discovery_proposal', 'Discovery / Nabídka')}</option>
              <option value="contracting">{t('stages.contracting', 'Zasmluvnění')}</option>
              <option value="onboarding">{t('stages.onboarding', 'Onboarding')}</option>
              <option value="farming">{t('stages.farming', 'Farming')}</option>
            </select>
          </div>

          {/* 6. Role */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.users.filters.roles', 'Role')}
            </label>
            <select
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* 7. User (Lost By or Assigned - Role-Aware) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.lost.filters.lostBy', 'Uživatel')}
            </label>
            <select
              value={scope.isRegular ? (currentUser?.id || '') : selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value);
                setCurrentPage(1);
              }}
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
        </div>

        {/* Filter controls row 2 (Country, Segment, General search, Reset) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.country', 'Země')}
            </label>
            <select
              value={selectedCountry}
              onChange={e => {
                setSelectedCountry(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Segment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('statistics.filters.segment', 'Segment')}
            </label>
            <select
              value={selectedSegmentId}
              onChange={e => {
                setSelectedSegmentId(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Search bar */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('common.search', 'Rychlé hledání')}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('statistics.lost.table.searchCompany', 'Hledat společnost, důvod, poznámku...')}
                className="w-full text-xs rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                hasActiveFilters
                  ? 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
                  : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('statistics.filters.reset', 'Resetovat filtry')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Header Bar with Counts */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-sm">
              {t('statistics.lost.title', 'Tabulka ztracených příležitostí')}
            </h3>
            <span className="bg-rose-100 text-rose-800 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredDeals.length}
            </span>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t('statistics.table.rowsPerPage', 'Počet na stránku:')}</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 outline-hidden"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-gray-100/75 text-gray-700 font-semibold border-b border-gray-200 select-none">
              <tr>
                {/* 1. Společnost */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.company', 'Společnost')}</span>
                    {sortField === 'company' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 2. Vznik */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.createdAt', 'Vznik')}</span>
                    {sortField === 'createdAt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 3. Datum ztráty */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('lostAt')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.lostAt', 'Datum ztráty')}</span>
                    {sortField === 'lostAt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 4. Doba do ztráty */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('duration')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.duration', 'Doba do ztráty')}</span>
                    {sortField === 'duration' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 5. Původní fáze */}
                <th className="px-4 py-3 whitespace-nowrap">
                  <span>{t('statistics.lost.columns.lostFromStage', 'Původní fáze')}</span>
                </th>

                {/* 6. Důvod ztráty */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('reason')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.reason', 'Důvod ztráty')}</span>
                    {sortField === 'reason' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 7. Poznámka k důvodu */}
                <th className="px-4 py-3 min-w-[200px]">
                  <span>{t('statistics.lost.columns.reasonNote', 'Poznámka / vysvětlení důvodu')}</span>
                </th>

                {/* 8. Kdo ztratil */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('lostBy')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.lost.columns.lostBy', 'Kdo ztratil')}</span>
                    {sortField === 'lostBy' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 9. Balíků / rok */}
                <th
                  className="px-4 py-3 cursor-pointer hover:bg-gray-200/60 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('parcels')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.lost.columns.yearlyParcels', 'Balíků / rok')}</span>
                    {sortField === 'parcels' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>

              {/* Column Filter Row */}
              <tr className="bg-gray-50 border-b border-gray-200">
                {/* Search company */}
                <th className="p-2 font-normal">
                  <input
                    type="text"
                    value={colSearchCompany}
                    onChange={e => {
                      setColSearchCompany(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('statistics.lost.table.searchCompany', 'Hledat firmu...')}
                    className="w-full text-[11px] px-2 py-1 bg-white border border-gray-300 rounded font-normal text-gray-700 outline-hidden"
                  />
                </th>

                {/* Created Date */}
                <th className="p-2 font-normal" />

                {/* Lost Date */}
                <th className="p-2 font-normal" />

                {/* Duration */}
                <th className="p-2 font-normal" />

                {/* Stage */}
                <th className="p-2 font-normal" />

                {/* Search reason */}
                <th className="p-2 font-normal">
                  <input
                    type="text"
                    value={colSearchReason}
                    onChange={e => {
                      setColSearchReason(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('statistics.lost.table.searchReason', 'Hledat důvod...')}
                    className="w-full text-[11px] px-2 py-1 bg-white border border-gray-300 rounded font-normal text-gray-700 outline-hidden"
                  />
                </th>

                {/* Search note */}
                <th className="p-2 font-normal">
                  <input
                    type="text"
                    value={colSearchNote}
                    onChange={e => {
                      setColSearchNote(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('statistics.lost.table.searchNote', 'Hledat v textu...')}
                    className="w-full text-[11px] px-2 py-1 bg-white border border-gray-300 rounded font-normal text-gray-700 outline-hidden"
                  />
                </th>

                {/* Search user */}
                <th className="p-2 font-normal">
                  <input
                    type="text"
                    value={colSearchUser}
                    onChange={e => {
                      setColSearchUser(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('statistics.lost.table.searchUser', 'Hledat osobu...')}
                    className="w-full text-[11px] px-2 py-1 bg-white border border-gray-300 rounded font-normal text-gray-700 outline-hidden"
                  />
                </th>

                {/* Parcels */}
                <th className="p-2 font-normal" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedDeals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium">
                      {t('statistics.lost.noRecords', 'Nebyly nalezeny žádné ztracené příležitosti odpovídající zadaným kritériím.')}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t('statistics.filters.reset', 'Resetovat filtry')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedDeals.map(deal => {
                  const company = companies.find(c => c.id === deal.companyId);
                  const reason = lostReasons.find(r => r.id === deal.lostReasonId);
                  const userLost = users.find(u => u.id === deal.lostBy);

                  // Calculate duration
                  let durationStr = '–';
                  if (deal.createdAt) {
                    const cMs = new Date(deal.createdAt).getTime();
                    const lMs = new Date(deal.lostAt || deal.updatedAt || deal.createdAt).getTime();
                    if (!isNaN(cMs) && !isNaN(lMs) && lMs >= cMs) {
                      durationStr = formatDaysAndHours(lMs - cMs, t);
                    }
                  }

                  const lostDateFormatted = deal.lostAt || deal.updatedAt
                    ? format(parseISO(deal.lostAt || deal.updatedAt!), 'dd.MM.yyyy HH:mm')
                    : '–';

                  const createdDateFormatted = deal.createdAt
                    ? format(parseISO(deal.createdAt), 'dd.MM.yyyy')
                    : '–';

                  const yearlyParcels = deal.estimatedYearlyParcels
                    ? Number(deal.estimatedYearlyParcels).toLocaleString(i18n.language === 'en' ? 'en-US' : 'cs-CZ')
                    : '–';

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-rose-50/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/deal/${deal.id}`)}
                    >
                      {/* 1. Společnost */}
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-rose-100 group-hover:text-rose-700 transition-colors shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors block">
                              {company?.name || 'Neznámá společnost'}
                            </span>
                            {company?.segment && (
                              <span className="text-[10px] text-gray-400 block">
                                {segments.find(s => s.id === company.segment)?.name || company.segment}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Vznik */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{createdDateFormatted}</span>
                        </div>
                      </td>

                      {/* 3. Datum ztráty */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <span className="font-semibold text-gray-800">{lostDateFormatted}</span>
                      </td>

                      {/* 4. Doba do ztráty */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{durationStr}</span>
                        </div>
                      </td>

                      {/* 5. Původní fáze */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {getStageBadge(deal.lostFromStage)}
                      </td>

                      {/* 6. Důvod ztráty */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-500" />
                          {reason ? reason.name : deal.lostReasonId || t('common.unspecified', 'Neuvedeno')}
                        </span>
                      </td>

                      {/* 7. Poznámka k důvodu */}
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-xs">
                        {deal.lostReason ? (
                          <div className="flex items-start gap-1.5" title={deal.lostReason}>
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 italic text-gray-600 font-normal">
                              "{deal.lostReason}"
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">–</span>
                        )}
                      </td>

                      {/* 8. Kdo ztratil */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {userLost ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                              {userLost.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{userLost.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>

                      {/* 9. Balíků / rok */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-gray-800 text-xs">
                        {yearlyParcels !== '–' ? (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            {yearlyParcels}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <div>
            {t('statistics.lost.table.showingRange', {
              start: filteredDeals.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0,
              end: Math.min(safeCurrentPage * pageSize, filteredDeals.length),
              total: filteredDeals.length,
              defaultValue: `Zobrazeno ${filteredDeals.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}–${Math.min(safeCurrentPage * pageSize, filteredDeals.length)} z ${filteredDeals.length} ztracených příležitostí`
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('statistics.table.firstPage', 'První stránka')}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('statistics.table.prevPage', 'Předchozí stránka')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-semibold text-gray-800">
              {t('statistics.table.pageOf', {
                current: safeCurrentPage,
                total: totalPages,
                defaultValue: `Stránka ${safeCurrentPage} z ${totalPages}`
              })}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('statistics.table.nextPage', 'Další stránka')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('statistics.table.lastPage', 'Poslední stránka')}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
