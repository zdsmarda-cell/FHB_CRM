import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store';
import { getDealsForUser } from '../../../lib/permissions';
import { Deal, Company, AuditLog } from '../../../types';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
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
  FileText
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

/**
 * Format milliseconds into Czech days and hours (e.g., "3 dny, 14 hodin")
 */
export function formatDaysAndHours(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '0 hodin';
  const totalHours = ms / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);

  const dayStr = days === 1 ? '1 den' : (days >= 2 && days <= 4 ? `${days} dny` : `${days} dní`);
  const hourStr = hours === 1 ? '1 hodina' : (hours >= 2 && hours <= 4 ? `${hours} hodiny` : `${hours} hodin`);

  if (days === 0) {
    return hours === 0 ? '< 1 hodina' : hourStr;
  }
  if (hours === 0) {
    return dayStr;
  }
  return `${dayStr}, ${hourStr}`;
}

export function OpportunitiesKpiView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const store = useStore();
  const { deals, companies, users, segments, auditLogs, currentUser } = store;

  // Base deals accessible by current user based on permission model
  const accessibleDeals = useMemo(() => {
    return getDealsForUser(store, currentUser);
  }, [store, currentUser]);

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

  // Table sorting
  const [tableSortDir, setTableSortDir] = useState<'desc' | 'asc'>('desc');
  const [tableSortKey, setTableSortKey] = useState<'createdAt' | 'name' | 'ico' | 'creator'>('createdAt');

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

      // User filter (Creator or Assigned hunter)
      if (selectedUserId !== 'all') {
        const isCreator = deal.createdBy === selectedUserId;
        const isHunter = deal.hunterId === selectedUserId;
        if (!isCreator && !isHunter) return false;
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

  // Summary Metric 3 (Bonus): Average time to transition from opportunity to lead for filtered deals
  const avgTimeToLeadGeneral = useMemo(() => {
    let totalMs = 0;
    let count = 0;

    filteredDeals.forEach(deal => {
      if (!deal.createdAt) return;
      const createdTime = new Date(deal.createdAt).getTime();

      // Find audit log for transition to lead
      const leadLog = (auditLogs || []).find(
        log => log.dealId === deal.id && log.field === 'stage' && log.newValue === 'lead'
      );

      if (leadLog && leadLog.timestamp) {
        const leadTime = new Date(leadLog.timestamp).getTime();
        const diff = leadTime - createdTime;
        if (diff >= 0) {
          totalMs += diff;
          count++;
        }
      } else if (deal.stage !== 'opportunity' && deal.updatedAt) {
        // Fallback if deal is in lead or beyond
        const updatedTime = new Date(deal.updatedAt).getTime();
        const diff = updatedTime - createdTime;
        if (diff > 0) {
          totalMs += diff;
          count++;
        }
      }
    });

    if (count === 0) return null;
    return formatDaysAndHours(totalMs / count);
  }, [filteredDeals, auditLogs]);

  // Last 12 months array (including current month)
  const last12MonthsList = useMemo(() => {
    const now = new Date();
    const months = [];
    const isCs = i18n.language === 'cs';

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, 'yyyy-MM');
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const label = format(monthDate, 'LLL yy', { locale: isCs ? cs : undefined });
      const fullLabel = format(monthDate, 'LLLL yyyy', { locale: isCs ? cs : undefined });

      months.push({
        key,
        start,
        end,
        label,
        fullLabel
      });
    }
    return months;
  }, [i18n.language]);

  // Graph 1 Data: Deals inserted into system per month over the last 12 months
  const monthlyInsertedData = useMemo(() => {
    return last12MonthsList.map(m => {
      // Find deals created within this month (matching user/country/region/segment filters without the date range restriction)
      const count = accessibleDeals.filter(deal => {
        if (!deal.createdAt) return false;
        const dealTime = new Date(deal.createdAt);
        if (!isWithinInterval(dealTime, { start: m.start, end: m.end })) return false;

        const company = companies.find(c => c.id === deal.companyId);

        if (selectedUserId !== 'all') {
          if (deal.createdBy !== selectedUserId && deal.hunterId !== selectedUserId) return false;
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

  // Graph 2 Data: Average days & hours between deal creation and stage change from opportunity to lead for last 12 months
  const monthlyLeadTransitionData = useMemo(() => {
    return last12MonthsList.map(m => {
      let totalDurationMs = 0;
      let transitionCount = 0;

      accessibleDeals.forEach(deal => {
        if (!deal.createdAt) return;
        const company = companies.find(c => c.id === deal.companyId);

        // Apply dimension filters
        if (selectedUserId !== 'all') {
          if (deal.createdBy !== selectedUserId && deal.hunterId !== selectedUserId) return;
        }
        if (selectedCountry !== 'all') {
          const country = company?.country || 'Czechia';
          if (country.toLowerCase() !== selectedCountry.toLowerCase()) return;
        }
        if (selectedRegion !== 'all' && company?.region !== selectedRegion) return;
        if (selectedSegment !== 'all' && company?.segment !== selectedSegment) return;

        const createdTime = new Date(deal.createdAt).getTime();

        // Check if transition to lead occurred in month m
        const leadLog = (auditLogs || []).find(
          log => log.dealId === deal.id && log.field === 'stage' && log.newValue === 'lead'
        );

        let transitionDate: Date | null = null;
        let diffMs = 0;

        if (leadLog && leadLog.timestamp) {
          transitionDate = new Date(leadLog.timestamp);
          diffMs = transitionDate.getTime() - createdTime;
        } else if (deal.stage !== 'opportunity' && deal.updatedAt) {
          transitionDate = new Date(deal.updatedAt);
          diffMs = transitionDate.getTime() - createdTime;
        }

        if (transitionDate && diffMs >= 0 && isWithinInterval(transitionDate, { start: m.start, end: m.end })) {
          totalDurationMs += diffMs;
          transitionCount++;
        }
      });

      const avgMs = transitionCount > 0 ? totalDurationMs / transitionCount : 0;
      const avgDays = Number((avgMs / (1000 * 60 * 60 * 24)).toFixed(1));
      const formattedDuration = transitionCount > 0 ? formatDaysAndHours(avgMs) : 'Žádná data';

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

  // Apply column-specific table filters and sorting to the list of opportunities
  const tableDeals = useMemo(() => {
    let result = filteredDeals.filter(deal => {
      const company = companies.find(c => c.id === deal.companyId);
      const creator = users.find(u => u.id === deal.createdBy)?.name || '-';
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
      if (colSearchDate && !dateFormatted.toLowerCase().includes(colSearchDate.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort table rows (default newest to oldest by createdAt)
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
      }

      if (valA < valB) return tableSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredDeals, companies, users, colSearchCompany, colSearchIco, colSearchUrl, colSearchCreator, colSearchDate, tableSortKey, tableSortDir]);

  const toggleTableSort = (key: 'createdAt' | 'name' | 'ico' | 'creator') => {
    if (tableSortKey === key) {
      setTableSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setTableSortKey(key);
      setTableSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters = Boolean(
    dateFrom || dateTo || selectedUserId !== 'all' || selectedCountry !== 'all' || selectedRegion !== 'all' || selectedSegment !== 'all' ||
    colSearchCompany || colSearchDate || colSearchUrl || colSearchIco || colSearchCreator
  );

  return (
    <div id="opportunities-kpi-container" className="space-y-6">
      {/* Dynamic Filter Toolbar */}
      <div id="statistics-filter-card" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>{t('statistics.filters.title', 'Filtry')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{t('statistics.filters.quickPeriods.allTime', 'Rychlé období')}:</span>
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
              onChange={e => setDateFrom(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
              placeholder="Od začátku"
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
              onChange={e => setDateTo(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
              placeholder="Dodnes"
            />
          </div>

          {/* User Filter */}
          <div>
            <label htmlFor="filter-user" className="block text-xs font-semibold text-gray-600 mb-1">
              {t('statistics.filters.user', 'Uživatel')}
            </label>
            <select
              id="filter-user"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allUsers', 'Všichni uživatelé')}</option>
              {users.map(u => (
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
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allCountries', 'Všechny země')}</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>{c}</option>
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
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allRegions', 'Všechny regiony')}</option>
              {availableRegions.map(r => (
                <option key={r} value={r}>{r}</option>
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
              onChange={e => setSelectedSegment(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
            >
              <option value="all">{t('statistics.filters.allSegments', 'Všechny segmenty')}</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Inserted Deals Count */}
        <div id="summary-card-count" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              {t('statistics.summary.totalOpportunities', 'Celkem vložených příležitostí')}
            </span>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {totalInsertedCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {hasActiveFilters ? 'Ve vybraném filtru a období' : 'Celkově v systému'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Average time between new deals */}
        <div id="summary-card-cadence" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              {t('statistics.summary.avgTimeBetweenCreations', 'Průměrná doba pro vložení nové')}
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {avgCreationInterval || '–'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgCreationInterval ? 'Interval mezi nově vytvořenými příležitostmi' : 'Nedostatek dat pro výpočet intervalu'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Average time from opportunity to lead */}
        <div id="summary-card-lead-time" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              {t('statistics.summary.avgTimeToLead', 'Průměrný čas přechodu do leadu')}
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {avgTimeToLeadGeneral || '–'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {avgTimeToLeadGeneral ? 'Doba od založení po změnu do stavu Lead' : 'Zatím žádné přechody do leadu'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Deals Inserted in Last 12 Months */}
        <div id="chart-card-inserted" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">
              {t('statistics.charts.insertedDealsTitle', 'Počet vložených příležitostí za posledních 12 měsíců')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('statistics.charts.insertedDealsSubtitle', 'Včetně aktuálního měsíce')}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyInsertedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }} 
                  tickLine={false}
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }} 
                  tickLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white px-3 py-2 rounded-md text-xs shadow-lg space-y-1">
                          <p className="font-bold text-gray-200">{data.fullMonth}</p>
                          <p className="text-indigo-300 font-semibold">
                            {t('statistics.charts.count', 'Vloženo')}: {data.count} {t('statistics.charts.dealsCount', 'příležitostí')}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Average Days and Hours between Creation and Lead Stage */}
        <div id="chart-card-lead-time" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">
              {t('statistics.charts.leadTransitionTitle', 'Průměrná doba od vložení po změnu stavu do leadu')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('statistics.charts.leadTransitionSubtitle', 'Za posledních 12 měsíců (ve dnech a hodinách)')}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLeadTransitionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }} 
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }} 
                  tickLine={false}
                  unit=" d"
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white px-3 py-2 rounded-md text-xs shadow-lg space-y-1">
                          <p className="font-bold text-gray-200">{data.fullMonth}</p>
                          <p className="text-teal-300 font-semibold">
                            {t('statistics.charts.avgDuration', 'Průměrná doba')}: {data.formattedDuration}
                          </p>
                          <p className="text-gray-400 text-[11px]">
                            {data.count} {t('statistics.charts.dealsCount', 'příležitostí přesunuto do leadu')}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="avgDays" 
                  fill="#0d9488" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={36}
                >
                  {monthlyLeadTransitionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count > 0 ? '#0d9488' : '#e5e7eb'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Opportunities List Table with Scrolling & Per-Column Filters */}
      <div id="opportunities-table-card" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-base">
              {t('statistics.table.title', 'Seznam vložených příležitostí')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('statistics.table.showingCount', { shown: tableDeals.length, total: filteredDeals.length })}
            </p>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-y-auto max-h-[520px] divide-y divide-gray-100">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 shadow-xs">
              <tr>
                {/* Column: Company Name */}
                <th 
                  className="px-5 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                  className="px-5 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                <th className="px-5 py-3 font-semibold text-xs select-none">
                  <span>{t('statistics.table.url', 'URL')}</span>
                </th>

                {/* Column: IČ */}
                <th 
                  className="px-5 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
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

                {/* Column: Created By */}
                <th 
                  className="px-5 py-3 font-semibold text-xs cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleTableSort('creator')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('statistics.table.createdBy', 'Kdo ji vytvořil')}</span>
                    {tableSortKey === 'creator' ? (
                      tableSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>

              {/* Per-column inline search filters row */}
              <tr className="bg-gray-50/80 border-t border-gray-200/60">
                <th className="px-4 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchCompany}
                      onChange={e => setColSearchCompany(e.target.value)}
                      placeholder={t('statistics.table.searchCompany', 'Hledat společnost...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-4 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchDate}
                      onChange={e => setColSearchDate(e.target.value)}
                      placeholder="dd.mm.rrrr..."
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-4 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchUrl}
                      onChange={e => setColSearchUrl(e.target.value)}
                      placeholder={t('statistics.table.searchUrl', 'Hledat URL...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-4 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchIco}
                      onChange={e => setColSearchIco(e.target.value)}
                      placeholder={t('statistics.table.searchIco', 'Hledat IČ...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
                <th className="px-4 py-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={colSearchCreator}
                      onChange={e => setColSearchCreator(e.target.value)}
                      placeholder={t('statistics.table.searchCreator', 'Hledat uživatele...')}
                      className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal"
                    />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {tableDeals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                tableDeals.map(deal => {
                  const company = companies.find(c => c.id === deal.companyId);
                  const creatorUser = users.find(u => u.id === deal.createdBy);
                  const creatorName = creatorUser?.name || users.find(u => u.id === deal.hunterId)?.name || 'Neznámý';
                  const primaryUrl = company?.urls && company.urls.length > 0 ? company.urls[0] : null;

                  return (
                    <tr 
                      key={deal.id}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/deal/${deal.id}`)}
                    >
                      {/* Company Name */}
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            {deal.createdAt ? format(parseISO(deal.createdAt), 'dd.MM.yyyy HH:mm') : '-'}
                          </span>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="px-5 py-3.5 text-xs text-gray-600" onClick={e => e.stopPropagation()}>
                        {primaryUrl ? (
                          <a
                            href={primaryUrl.startsWith('http') ? primaryUrl : `https://${primaryUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline max-w-[220px] truncate"
                          >
                            <span className="truncate">{primaryUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* IČ */}
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-700">
                        {company?.companyId ? (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-medium">
                            {company.companyId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="px-5 py-3.5 text-xs text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {creatorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{creatorName}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
