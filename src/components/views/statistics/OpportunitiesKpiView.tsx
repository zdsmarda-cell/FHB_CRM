import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store';
import { Deal, Company, AuditLog, Stage } from '../../../types';
import { isTestDeal, getUserStatisticsScope, formatDaysAndHours } from '../../../lib/statistics';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Filter, 
  RotateCcw, 
  Search, 
  ExternalLink, 
  TrendingUp, 
  Layers, 
  User as UserIcon, 
  Globe, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Users as UsersIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export function OpportunitiesKpiView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const store = useStore();
  const { deals, companies, users, segments, auditLogs, currentUser } = store;

  // Evaluate RBAC Scope:
  // - Admin & CSO: sees all data, can filter across all users
  // - Manager: sees data of themselves and their subordinates only
  // - Regular: sees only their own data (cannot filter across others)
  const scope = useMemo(() => {
    return getUserStatisticsScope(currentUser, users);
  }, [currentUser, users]);

  // Base deals:
  // 1. Exclude test opportunities (isTestDeal)
  // 2. Restrict to user's RBAC scope
  const accessibleDeals = useMemo(() => {
    return deals.filter(deal => {
      // Exclude test deals
      if (isTestDeal(deal, store)) return false;

      // Admin & CSO can see all deals
      if (scope.isAll) return true;

      // Check if creator, hunter, closer, or farmer belongs to allowed scope
      const matchesScope = 
        scope.allowedUserIds.includes(deal.createdBy) ||
        (deal.hunterId && scope.allowedUserIds.includes(deal.hunterId)) ||
        (deal.closerId && scope.allowedUserIds.includes(deal.closerId)) ||
        (deal.farmerId && scope.allowedUserIds.includes(deal.farmerId));

      return matchesScope;
    });
  }, [deals, store, scope]);

  // Main Filters state: Od - Do default from the beginning (empty = all time)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  // Column-specific table filters
  const [colSearchCompany, setColSearchCompany] = useState('');
  const [colSearchDate, setColSearchDate] = useState('');
  const [colSearchUrl, setColSearchUrl] = useState('');
  const [colSearchIco, setColSearchIco] = useState('');
  const [colSearchCreator, setColSearchCreator] = useState('');
  const [colSearchAssigned, setColSearchAssigned] = useState('');
  const [colSearchStage, setColSearchStage] = useState('all');

  // Table sorting
  const [tableSortDir, setTableSortDir] = useState<'desc' | 'asc'>('desc');
  const [tableSortKey, setTableSortKey] = useState<'createdAt' | 'name' | 'ico' | 'creator' | 'assigned' | 'stage'>('createdAt');

  // Table pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Available unique countries and regions from companies
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

  // Quick preset period handler
  const handleQuickPeriod = (preset: 'all' | '12m' | 'thisYear' | 'thisMonth') => {
    const now = new Date();
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === '12m') {
      const past = subMonths(now, 11);
      setDateFrom(format(startOfMonth(past), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisYear') {
      setDateFrom(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisMonth') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(now, 'yyyy-MM-dd'));
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedUserId('all');
    setSelectedCountry('all');
    setSelectedRegion('all');
    setSelectedSegment('all');
    setColSearchCompany('');
    setColSearchDate('');
    setColSearchUrl('');
    setColSearchIco('');
    setColSearchCreator('');
    setColSearchAssigned('');
    setColSearchStage('all');
    setCurrentPage(1);
  };

  // Filter deals dynamically based on main filters
  const filteredDeals = useMemo(() => {
    return accessibleDeals.filter(deal => {
      const company = companies.find(c => c.id === deal.companyId);

      // Date range filter
      if (deal.createdAt) {
        const dealDateStr = deal.createdAt.substring(0, 10);
        if (dateFrom && dealDateStr < dateFrom) return false;
        if (dateTo && dealDateStr > dateTo) return false;
      } else {
        if (dateFrom) return false;
      }

      // User filter (Creator or Assigned)
      if (selectedUserId !== 'all') {
        const isCreator = deal.createdBy === selectedUserId;
        const isHunter = deal.hunterId === selectedUserId;
        const isCloser = deal.closerId === selectedUserId;
        const isFarmer = deal.farmerId === selectedUserId;
        if (!isCreator && !isHunter && !isCloser && !isFarmer) return false;
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

      return true;
    });
  }, [accessibleDeals, companies, dateFrom, dateTo, selectedUserId, selectedCountry, selectedRegion, selectedSegment]);

  // Summary Metric 1: Total inserted deals
  const totalInsertedCount = filteredDeals.length;

  // Summary Metric 2: Average time between successive deal creations (in days and hours)
  const avgCreationInterval = useMemo(() => {
    const dates = filteredDeals
      .map(d => (d.createdAt ? new Date(d.createdAt).getTime() : NaN))
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    if (dates.length < 2) return null;

    const totalDiffMs = dates[dates.length - 1] - dates[0];
    const avgMs = totalDiffMs / (dates.length - 1);
    return formatDaysAndHours(avgMs);
  }, [filteredDeals]);

  // Summary Metric 3: Average time to transition from opportunity to lead for filtered deals
  const avgTimeToLeadGeneral = useMemo(() => {
    let totalMs = 0;
    let count = 0;

    filteredDeals.forEach(deal => {
      const dealLogs = auditLogs
        .filter(l => l.dealId === deal.id && l.field === 'stage' && l.newValue === 'lead')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (dealLogs.length > 0 && deal.createdAt) {
        const createdMs = new Date(deal.createdAt).getTime();
        const leadMs = new Date(dealLogs[0].timestamp).getTime();
        if (leadMs >= createdMs) {
          totalMs += (leadMs - createdMs);
          count++;
        }
      } else if (deal.stage !== 'opportunity' && deal.createdAt) {
        const anyLogs = auditLogs
          .filter(l => l.dealId === deal.id && l.field === 'stage')
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (anyLogs.length > 0) {
          const createdMs = new Date(deal.createdAt).getTime();
          const firstTransitionMs = new Date(anyLogs[0].timestamp).getTime();
          if (firstTransitionMs >= createdMs) {
            totalMs += (firstTransitionMs - createdMs);
            count++;
          }
        }
      }
    });

    if (count === 0) return null;
    return formatDaysAndHours(totalMs / count, t);
  }, [filteredDeals, auditLogs, t, i18n.language]);

  // Dynamic date-fns locale based on i18n language
  const dateLocale = useMemo(() => {
    return i18n.language?.startsWith('en') ? enUS : cs;
  }, [i18n.language]);

  // Last 12 months array (including current month)
  const last12MonthsList = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const label = format(d, 'MMM yy', { locale: dateLocale });
      const fullLabel = format(d, 'LLLL yyyy', { locale: dateLocale });
      months.push({ year, month, start, end, label, fullLabel });
    }
    return months;
  }, [dateLocale]);

  // Chart 1 Data: Deals inserted per month (last 12 months, respecting main filters)
  const chartInsertedDealsData = useMemo(() => {
    return last12MonthsList.map(m => {
      const count = accessibleDeals.filter(deal => {
        if (!deal.createdAt) return false;
        const d = new Date(deal.createdAt);
        if (d < m.start || d > m.end) return false;

        const company = companies.find(c => c.id === deal.companyId);

        if (selectedUserId !== 'all') {
          const isCreator = deal.createdBy === selectedUserId;
          const isHunter = deal.hunterId === selectedUserId;
          const isCloser = deal.closerId === selectedUserId;
          const isFarmer = deal.farmerId === selectedUserId;
          if (!isCreator && !isHunter && !isCloser && !isFarmer) return false;
        }
        if (selectedCountry !== 'all') {
          const country = company?.country || 'Czechia';
          if (country.toLowerCase() !== selectedCountry.toLowerCase()) return false;
        }
        if (selectedRegion !== 'all' && company?.region !== selectedRegion) return false;
        if (selectedSegment !== 'all' && company?.segment !== selectedSegment) return false;

        return true;
      }).length;

      return {
        month: m.label,
        fullMonth: m.fullLabel,
        count
      };
    });
  }, [last12MonthsList, accessibleDeals, companies, selectedUserId, selectedCountry, selectedRegion, selectedSegment]);

  // Chart 2 Data: Average time between creation and transition to lead (days & hours)
  const chartLeadTransitionData = useMemo(() => {
    return last12MonthsList.map(m => {
      let totalDurationMs = 0;
      let transitionCount = 0;

      accessibleDeals.forEach(deal => {
        if (!deal.createdAt) return false;

        const company = companies.find(c => c.id === deal.companyId);

        if (selectedUserId !== 'all') {
          const isCreator = deal.createdBy === selectedUserId;
          const isHunter = deal.hunterId === selectedUserId;
          const isCloser = deal.closerId === selectedUserId;
          const isFarmer = deal.farmerId === selectedUserId;
          if (!isCreator && !isHunter && !isCloser && !isFarmer) return;
        }
        if (selectedCountry !== 'all') {
          const country = company?.country || 'Czechia';
          if (country.toLowerCase() !== selectedCountry.toLowerCase()) return;
        }
        if (selectedRegion !== 'all' && company?.region !== selectedRegion) return;
        if (selectedSegment !== 'all' && company?.segment !== selectedSegment) return;

        const stageLogs = auditLogs
          .filter(l => l.dealId === deal.id && l.field === 'stage' && l.newValue === 'lead')
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let transitionDate: Date | null = null;
        if (stageLogs.length > 0) {
          transitionDate = new Date(stageLogs[0].timestamp);
        } else if (deal.stage !== 'opportunity') {
          const anyLogs = auditLogs
            .filter(l => l.dealId === deal.id && l.field === 'stage')
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          if (anyLogs.length > 0) {
            transitionDate = new Date(anyLogs[0].timestamp);
          }
        }

        if (transitionDate && transitionDate >= m.start && transitionDate <= m.end) {
          const createdDate = new Date(deal.createdAt);
          const diff = transitionDate.getTime() - createdDate.getTime();
          if (diff >= 0) {
            totalDurationMs += diff;
            transitionCount++;
          }
        }
      });

      const avgMs = transitionCount > 0 ? totalDurationMs / transitionCount : 0;
      const avgDays = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10;
      const formattedDuration = formatDaysAndHours(avgMs, t);

      return {
        month: m.label,
        fullMonth: m.fullLabel,
        avgDays,
        avgMs,
        formattedDuration,
        count: transitionCount
      };
    });
  }, [last12MonthsList, accessibleDeals, companies, auditLogs, selectedUserId, selectedCountry, selectedRegion, selectedSegment]);

  // Helper to get assignee name for a deal
  const getDealAssignee = (deal: Deal) => {
    if (deal.stage === 'opportunity' || deal.stage === 'lead') {
      return users.find(u => u.id === deal.hunterId)?.name || '–';
    }
    if (deal.stage === 'discovery_proposal' || deal.stage === 'contracting' || deal.stage === 'onboarding') {
      return users.find(u => u.id === deal.closerId)?.name || '–';
    }
    if (deal.stage === 'farming') {
      return users.find(u => u.id === deal.farmerId)?.name || '–';
    }
    // Lost or fallback
    return users.find(u => u.id === deal.hunterId || u.id === deal.closerId || u.id === deal.farmerId)?.name || '–';
  };

  // Helper for stage badge
  const getStageBadge = (stage: Stage) => {
    const stageLabel = t(`stages.${stage}`, stage);
    switch (stage) {
      case 'opportunity':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800">{stageLabel}</span>;
      case 'lead':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-100 text-indigo-800">{stageLabel}</span>;
      case 'discovery_proposal':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800">{stageLabel}</span>;
      case 'contracting':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-800">{stageLabel}</span>;
      case 'onboarding':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-100 text-purple-800">{stageLabel}</span>;
      case 'farming':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800">{stageLabel}</span>;
      case 'lost':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-100 text-rose-800">{stageLabel}</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-800">{stageLabel}</span>;
    }
  };

  // Apply column-specific table filters and sorting to the list of opportunities
  const tableDeals = useMemo(() => {
    let result = filteredDeals.filter(deal => {
      const company = companies.find(c => c.id === deal.companyId);
      const creator = users.find(u => u.id === deal.createdBy)?.name || '-';
      const assignee = getDealAssignee(deal);
      const companyName = company?.name || '';
      const ico = company?.companyId || '';
      const urlsStr = (company?.urls || []).join(' ');
      const dateFormatted = deal.createdAt ? format(parseISO(deal.createdAt), 'dd.MM.yyyy HH:mm') : '';

      if (colSearchCompany && !companyName.toLowerCase().includes(colSearchCompany.toLowerCase())) {
        return false;
      }
      if (colSearchIco && !ico.toLowerCase().includes(colSearchIco.toLowerCase())) {
        return false;
      }
      if (colSearchUrl && !urlsStr.toLowerCase().includes(colSearchUrl.toLowerCase())) {
        return false;
      }
      if (colSearchCreator && !creator.toLowerCase().includes(colSearchCreator.toLowerCase())) {
        return false;
      }
      if (colSearchAssigned && !assignee.toLowerCase().includes(colSearchAssigned.toLowerCase())) {
        return false;
      }
      if (colSearchStage !== 'all' && deal.stage !== colSearchStage) {
        return false;
      }
      if (colSearchDate && !dateFormatted.toLowerCase().includes(colSearchDate.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort table rows
    result.sort((a, b) => {
      const companyA = companies.find(c => c.id === a.companyId);
      const companyB = companies.find(c => c.id === b.companyId);

      let valA: string | number = '';
      let valB: string | number = '';

      if (tableSortKey === 'createdAt') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (tableSortKey === 'name') {
        valA = companyA?.name.toLowerCase() || '';
        valB = companyB?.name.toLowerCase() || '';
      } else if (tableSortKey === 'ico') {
        valA = companyA?.companyId || '';
        valB = companyB?.companyId || '';
      } else if (tableSortKey === 'creator') {
        valA = users.find(u => u.id === a.createdBy)?.name.toLowerCase() || '';
        valB = users.find(u => u.id === b.createdBy)?.name.toLowerCase() || '';
      } else if (tableSortKey === 'assigned') {
        valA = getDealAssignee(a).toLowerCase();
        valB = getDealAssignee(b).toLowerCase();
      } else if (tableSortKey === 'stage') {
        valA = a.stage;
        valB = b.stage;
      }

      if (valA < valB) return tableSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredDeals, companies, users, colSearchCompany, colSearchIco, colSearchUrl, colSearchCreator, colSearchAssigned, colSearchStage, colSearchDate, tableSortKey, tableSortDir]);

  // Pagination calculation
  const totalPages = Math.ceil(tableDeals.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const pagedDeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return tableDeals.slice(startIndex, startIndex + pageSize);
  }, [tableDeals, safeCurrentPage, pageSize]);

  const toggleTableSort = (key: 'createdAt' | 'name' | 'ico' | 'creator' | 'assigned' | 'stage') => {
    if (tableSortKey === key) {
      setTableSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setTableSortKey(key);
      setTableSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters = Boolean(
    dateFrom || dateTo || selectedUserId !== 'all' || selectedCountry !== 'all' || selectedRegion !== 'all' || selectedSegment !== 'all' ||
    colSearchCompany || colSearchDate || colSearchUrl || colSearchIco || colSearchCreator || colSearchAssigned || colSearchStage !== 'all'
  );

  return (
    <div id="opportunities-kpi-container" className="space-y-6">
      {/* Top Banner with Scope Notice */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              {t('statistics.opportunities.heading', 'Příležitosti – Přehled a KPI')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {t('statistics.opportunities.subheading', 'Analýza nově vložených příležitostí a dynamika konverze do leadu')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scope.isAll && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('statistics.scope.allData', { role: currentUser?.role?.toUpperCase() })}
              </span>
            )}
            {scope.isManager && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <UsersIcon className="w-3.5 h-3.5" />
                {t('statistics.scope.managerData', { count: scope.accessibleUsers.length })}
              </span>
            )}
            {scope.isRegular && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                {t('statistics.scope.regularData', { name: currentUser?.name })}
              </span>
            )}
          </div>
        </div>

        {/* 3 Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
          <div id="stat-card-total-inserted" className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 block">
                  {t('statistics.summary.totalOpportunities', 'Celkem vložených příležitostí')}
                </span>
                <span className="text-2xl font-bold text-gray-900 leading-tight block mt-0.5">
                  {totalInsertedCount}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {t('statistics.opportunities.totalOpportunitiesDesc', 'Ve vybraném období a filtru (bez testovacích záznamů)')}
            </p>
          </div>

          <div id="stat-card-avg-creation-interval" className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 block">
                  {t('statistics.summary.avgTimeBetweenCreations', 'Průměrná doba pro vložení nové příležitosti')}
                </span>
                <span className="text-xl font-bold text-emerald-700 leading-tight block mt-0.5">
                  {avgCreationInterval || '–'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {t('statistics.opportunities.avgTimeBetweenCreationsDesc', 'Průměrný interval mezi dvěma po sobě vloženými příležitostmi')}
            </p>
          </div>

          <div id="stat-card-avg-time-to-lead" className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 block">
                  {t('statistics.summary.avgTimeToLead', 'Průměrný čas přechodu do leadu')}
                </span>
                <span className="text-xl font-bold text-blue-700 leading-tight block mt-0.5">
                  {avgTimeToLeadGeneral || '–'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {t('statistics.opportunities.avgTimeToLeadDesc', 'Doba od založení příležitosti do prvního posunu stavu')}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Filter Toolbar */}
      <div id="statistics-filter-card" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
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
              {t('statistics.filters.quickPeriod', 'Rychlý výběr období:')}
            </span>
            <button
              type="button"
              id="filter-preset-all"
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
              id="filter-preset-12m"
              onClick={() => handleQuickPeriod('12m')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.last12Months', 'Posledních 12 měsíců')}
            </button>
            <button
              type="button"
              id="filter-preset-this-year"
              onClick={() => handleQuickPeriod('thisYear')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.thisYear', 'Tento rok')}
            </button>
            <button
              type="button"
              id="filter-preset-this-month"
              onClick={() => handleQuickPeriod('thisMonth')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {t('statistics.filters.thisMonth', 'Tento měsíc')}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                id="btn-reset-filters"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 ml-2 px-2.5 py-1 text-xs rounded-md font-medium text-red-600 hover:bg-red-50 transition-colors border border-red-200"
                title={t('statistics.filters.reset', 'Resetovat filtry')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('statistics.filters.reset', 'Resetovat filtry')}
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Date From (Od) */}
          <div>
            <label htmlFor="filter-date-from" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.periodFrom', 'Od')}
            </label>
            <input
              type="date"
              id="filter-date-from"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
              placeholder={t('statistics.filters.periodFromPlaceholder', 'Od začátku')}
            />
          </div>

          {/* Date To (Do) */}
          <div>
            <label htmlFor="filter-date-to" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.periodTo', 'Do')}
            </label>
            <input
              type="date"
              id="filter-date-to"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
              placeholder={t('statistics.filters.periodToPlaceholder', 'Dodnes')}
            />
          </div>

          {/* User Filter (Role-Aware) */}
          <div>
            <label htmlFor="filter-user" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.user', 'Uživatel')}
            </label>
            <select
              id="filter-user"
              value={scope.isRegular ? (currentUser?.id || '') : selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value);
                setCurrentPage(1);
              }}
              disabled={scope.isRegular}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
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

          {/* Country Filter */}
          <div>
            <label htmlFor="filter-country" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.country', 'Země')}
            </label>
            <select
              id="filter-country"
              value={selectedCountry}
              onChange={e => {
                setSelectedCountry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allCountries', 'Všechny země')}</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label htmlFor="filter-region" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.region', 'Region')}
            </label>
            <select
              id="filter-region"
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allRegions', 'Všechny regiony')}</option>
              {availableRegions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Segment Filter */}
          <div>
            <label htmlFor="filter-segment" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.segment', 'Segment')}
            </label>
            <select
              id="filter-segment"
              value={selectedSegment}
              onChange={e => {
                setSelectedSegment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allSegments', 'Všechny segmenty')}</option>
              {segments
                .filter(s => s.isActive !== false)
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2 Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Inserted Deals per Month */}
        <div id="chart-inserted-deals-card" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {t('statistics.charts.insertedDealsTitle', 'Počet vložených příležitostí za posledních 12 měsíců')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('statistics.charts.insertedDealsSubtitle', 'Včetně aktuálního měsíce (bez testovacích záznamů)')}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartInsertedDealsData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-semibold capitalize">{data.fullMonth}</p>
                          <p className="text-indigo-300">
                            {t('statistics.charts.count', 'Vloženo')}: <strong className="text-white font-bold">{data.count}</strong> {t('statistics.charts.dealsCount', 'příležitostí')}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                  {chartInsertedDealsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === chartInsertedDealsData.length - 1 ? '#6366F1' : '#4F46E5'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Days to Lead */}
        <div id="chart-lead-transition-card" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {t('statistics.charts.leadTransitionTitle', 'Průměrná doba mezi vloženou příležitostí a změnou do leadu')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('statistics.charts.leadTransitionSubtitle', 'Za posledních 12 měsíců (ve dnech a hodinách)')}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartLeadTransitionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                  unit=" d"
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-semibold capitalize">{data.fullMonth}</p>
                          <p className="text-emerald-300">
                            {t('statistics.charts.avgDuration', 'Průměrná doba')}: <strong className="text-white font-bold">{data.formattedDuration}</strong>
                          </p>
                          <p className="text-gray-400 text-[10px]">
                            {t('statistics.charts.convertedCount', 'Změněno příležitostí')}: {data.count}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgDays" fill="#10B981" radius={[4, 4, 0, 0]}>
                  {chartLeadTransitionData.map((entry, index) => (
                    <Cell 
                      key={`cell-lead-${index}`} 
                      fill={index === chartLeadTransitionData.length - 1 ? '#34D399' : '#10B981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table: Opportunities List with Column Filtering, Sorting and Pagination */}
      <div id="opportunities-table-card" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Card Header with count and pagination selector */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-gray-900">
              {t('statistics.table.title', 'Seznam vložených příležitostí')}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              {t('statistics.table.showingCount', { shown: tableDeals.length, total: tableDeals.length })}
            </span>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{t('statistics.table.rowsPerPage', 'Řádků na stránku')}:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table View with Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-xs">
              <tr className="text-gray-600">
                {/* Column: Company Name */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.companyName', 'Název společnosti')}</span>
                    {tableSortKey === 'name' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Column: Date inserted */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('createdAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.createdAt', 'Datum vložení do systému')}</span>
                    {tableSortKey === 'createdAt' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Column: URL */}
                <th className="px-4 py-3 font-semibold text-xs select-none">
                  <span>{t('statistics.table.url', 'URL')}</span>
                </th>

                {/* Column: IČ */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('ico')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.ico', 'IČ')}</span>
                    {tableSortKey === 'ico' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Column: Kdo ji zadal (Created By) */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('creator')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.createdBy', 'Kdo ji zadal')}</span>
                    {tableSortKey === 'creator' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Column: Přiřazený obchodník (Assignee) */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('assigned')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.assignedTo', 'Přiřazený obchodník')}</span>
                    {tableSortKey === 'assigned' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Column: Fáze */}
                <th 
                  className="px-4 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('stage')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.stage', 'Fáze')}</span>
                    {tableSortKey === 'stage' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>

              {/* Per-column inline search filters row */}
              <tr className="bg-gray-50/80 border-t border-gray-200/60">
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchCompany}
                      onChange={e => {
                        setColSearchCompany(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchCompany', 'Hledat společnost...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchDate}
                      onChange={e => {
                        setColSearchDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchDatePlaceholder', 'dd.mm.rrrr...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchUrl}
                      onChange={e => {
                        setColSearchUrl(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchUrl', 'Hledat URL...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchIco}
                      onChange={e => {
                        setColSearchIco(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchIco', 'Hledat IČ...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchCreator}
                      onChange={e => {
                        setColSearchCreator(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchCreator', 'Hledat uživatele...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchAssigned}
                      onChange={e => {
                        setColSearchAssigned(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t('statistics.table.searchAssigned', 'Hledat přiřazeného...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-3 py-1.5">
                  <select
                    value={colSearchStage}
                    onChange={e => {
                      setColSearchStage(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                  >
                    <option value="all">{t('statistics.table.allStages', 'Všechny fáze')}</option>
                    <option value="opportunity">{t('stages.opportunity', 'Příležitost')}</option>
                    <option value="lead">{t('stages.lead', 'Lead')}</option>
                    <option value="discovery_proposal">{t('stages.discovery_proposal', 'Discovery')}</option>
                    <option value="contracting">{t('stages.contracting', 'Contracting')}</option>
                    <option value="onboarding">{t('stages.onboarding', 'Onboarding')}</option>
                    <option value="farming">{t('stages.farming', 'Farming')}</option>
                    <option value="lost">{t('stages.lost', 'Lost')}</option>
                  </select>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {pagedDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm font-medium">{t('statistics.table.noRecords', 'Nebyly nalezeny žádné příležitosti odpovídající zadaným kritériím.')}</p>
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
                pagedDeals.map(deal => {
                  const company = companies.find(c => c.id === deal.companyId);
                  const creatorUser = users.find(u => u.id === deal.createdBy);
                  const creatorName = creatorUser?.name || deal.createdBy || 'Neznámý';
                  const assigneeName = getDealAssignee(deal);
                  const primaryUrl = company?.urls && company.urls.length > 0 ? company.urls[0] : null;

                  return (
                    <tr 
                      key={deal.id}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/deal/${deal.id}`)}
                    >
                      {/* Company Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors block truncate">
                              {company?.name || 'Neznámá společnost'}
                            </span>
                            {company?.segment && (
                              <span className="text-[11px] text-gray-400 block truncate">
                                {segments.find(s => s.id === company.segment)?.name || company.segment}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date Inserted */}
                      <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            {deal.createdAt ? format(parseISO(deal.createdAt), 'dd.MM.yyyy HH:mm') : '-'}
                          </span>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="px-4 py-3.5 text-xs text-gray-600" onClick={e => e.stopPropagation()}>
                        {primaryUrl ? (
                          <a
                            href={primaryUrl.startsWith('http') ? primaryUrl : `https://${primaryUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline max-w-[180px] truncate"
                          >
                            <span className="truncate">{primaryUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* IČ */}
                      <td className="px-4 py-3.5 text-xs font-mono text-gray-700 whitespace-nowrap">
                        {company?.companyId ? (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-medium">
                            {company.companyId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Kdo ji zadal */}
                      <td className="px-4 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {creatorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{creatorName}</span>
                        </div>
                      </td>

                      {/* Přiřazený obchodník */}
                      <td className="px-4 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                        <span className="text-gray-600 font-medium">{assigneeName}</span>
                      </td>

                      {/* Fáze */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStageBadge(deal.stage)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-gray-500 font-medium">
            {t('statistics.table.showingRange', {
              start: tableDeals.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1,
              end: Math.min(safeCurrentPage * pageSize, tableDeals.length),
              total: tableDeals.length
            })}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('statistics.table.firstPage', 'První strana')}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('statistics.table.prevPage', 'Předchozí strana')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-gray-700 font-semibold">
              {t('statistics.table.pageOf', { current: safeCurrentPage, total: totalPages })}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('statistics.table.nextPage', 'Další strana')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('statistics.table.lastPage', 'Poslední strana')}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
