import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, apiFetch } from '../../../store';
import { User, Deal, Company, Role, Stage } from '../../../types';
import { isTestDeal, getUserStatisticsScope, formatDaysAndHours } from '../../../lib/statistics';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  RotateCcw, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Check, 
  ChevronDown, 
  TrendingUp, 
  Clock, 
  Activity, 
  Edit3, 
  MessageSquare, 
  Briefcase, 
  LogIn, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  Award
} from 'lucide-react';

const STAGE_ORDER: Stage[] = [
  'opportunity',
  'lead',
  'discovery_proposal',
  'contracting',
  'onboarding',
  'farming'
];

interface UserKpiRow {
  user: User;
  loginsCount: number;
  dealsCreatedCount: number;
  activitiesCount: number;
  attributeUpdatesCount: number;
  assignedDealsCount: number;
  notesCount: number;
  avgProcessingTimeMs: number | null;
  avgProcessingTimeFormatted: string;
  forwardTransitionsCount: number;
  totalAssignedDeals: number;
  conversionRatePercent: number | null;
}

export function UsersKpiView() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const { users, deals, companies, auditLogs, currentUser, segments } = store;

  // Evaluate RBAC Scope:
  // - Admin & CSO: sees all users, can filter across any user
  // - Manager: sees themselves and subordinates only
  // - Regular: sees only themselves
  const scope = useMemo(() => {
    return getUserStatisticsScope(currentUser, users);
  }, [currentUser, users]);

  // Login counts from backend
  const [loginCounts, setLoginCounts] = useState<Record<string, number>>({});
  const [isLoadingLogins, setIsLoadingLogins] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingLogins(true);
    apiFetch('/api/user_login_counts')
      .then(res => (res.ok ? res.json() : {}))
      .then(data => {
        if (isMounted) setLoginCounts(data || {});
      })
      .catch(err => {
        console.warn('Could not load user login counts:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLogins(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filters state
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]); // Empty = all accessible
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [dealDateFrom, setDealDateFrom] = useState<string>('');
  const [dealDateTo, setDealDateTo] = useState<string>('');

  // Multi-select user dropdown open state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close multi-select on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Table search & sorting
  const [generalSearch, setGeneralSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof UserKpiRow>('dealsCreatedCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick period handler
  const handleQuickPeriod = (preset: 'all' | '12m' | 'thisYear' | 'thisMonth') => {
    const now = new Date();
    if (preset === 'all') {
      setDealDateFrom('');
      setDealDateTo('');
    } else if (preset === '12m') {
      const past = subMonths(now, 11);
      setDealDateFrom(format(startOfMonth(past), 'yyyy-MM-dd'));
      setDealDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisYear') {
      setDealDateFrom(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
      setDealDateTo(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisMonth') {
      setDealDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDealDateTo(format(now, 'yyyy-MM-dd'));
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedRole('all');
    setSelectedUserIds([]);
    setSelectedCountry('all');
    setSelectedRegion('all');
    setSelectedSegment('all');
    setDealDateFrom('');
    setDealDateTo('');
    setGeneralSearch('');
    setCurrentPage(1);
  };

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

  // Base accessible users (based on RBAC)
  const accessibleUsers = useMemo(() => {
    return scope.accessibleUsers;
  }, [scope]);

  // Filter deals based on date/country/region/segment, EXCLUDING test opportunities
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Rule: Do statistik se nepocitaji testovaci prilezitosti!
      if (isTestDeal(deal, store)) return false;

      // Deal creation date filter OD - DO
      if (deal.createdAt) {
        const dealDateStr = deal.createdAt.substring(0, 10);
        if (dealDateFrom && dealDateStr < dealDateFrom) return false;
        if (dealDateTo && dealDateStr > dealDateTo) return false;
      } else {
        if (dealDateFrom) return false;
      }

      const company = companies.find(c => c.id === deal.companyId);

      // Country
      if (selectedCountry !== 'all') {
        const country = company?.country || 'Czechia';
        if (country.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      }

      // Region
      if (selectedRegion !== 'all') {
        if (company?.region !== selectedRegion) return false;
      }

      // Segment
      if (selectedSegment !== 'all') {
        if (company?.segment !== selectedSegment) return false;
      }

      return true;
    });
  }, [deals, store, companies, dealDateFrom, dealDateTo, selectedCountry, selectedRegion, selectedSegment]);

  const filteredDealIdsSet = useMemo(() => {
    return new Set(filteredDeals.map(d => d.id));
  }, [filteredDeals]);

  // Calculate Metrics for each accessible user
  const userRows: UserKpiRow[] = useMemo(() => {
    // Pre-group deal audit logs by dealId for performance
    const stageLogsByDeal = new Map<string, typeof auditLogs>();
    auditLogs.forEach(log => {
      if (log.dealId && filteredDealIdsSet.has(log.dealId) && log.field === 'stage') {
        const arr = stageLogsByDeal.get(log.dealId) || [];
        arr.push(log);
        stageLogsByDeal.set(log.dealId, arr);
      }
    });

    // Sort logs inside each deal
    stageLogsByDeal.forEach((logs, dealId) => {
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    return accessibleUsers.map(user => {
      // 1. Kolikrát se do systému přihlásil
      const loginsCount = loginCounts[user.id] || 0;

      // 2. Kolik zadal příležitostí (created by this user in filtered set)
      const dealsCreatedCount = filteredDeals.filter(d => d.createdBy === user.id).length;

      // 3. Kolik zadal aktivit (které nebyly smazány)
      // Must not be deleted (isVisible !== false) and if linked to deal, deal must be in filtered set
      const activitiesCount = store.activities.filter(a => {
        if (a.createdBy !== user.id) return false;
        if (a.isVisible === false) return false;
        if (a.dealId && !filteredDealIdsSet.has(a.dealId)) return false;
        return true;
      }).length;

      // 4. Kolikrát doplnil či aktualizoval atributy u příležitostí
      // Audit logs where changedBy === user.id and field !== 'stage'
      const attributeUpdatesCount = auditLogs.filter(log => {
        if (log.changedBy !== user.id) return false;
        if (!log.dealId || !filteredDealIdsSet.has(log.dealId)) return false;
        if (log.field === 'stage') return false;
        return true;
      }).length;

      // 5. Kolik má na sobě aktuálně příležitostí přiřazených
      // Open deals currently assigned to user based on role/stage
      const assignedDealsCount = filteredDeals.filter(deal => {
        if (deal.stage === 'lost') return false;
        if (deal.stage === 'opportunity' || deal.stage === 'lead') {
          return deal.hunterId === user.id;
        }
        if (
          deal.stage === 'discovery_proposal' ||
          deal.stage === 'contracting' ||
          deal.stage === 'onboarding'
        ) {
          return deal.closerId === user.id;
        }
        if (deal.stage === 'farming') {
          return deal.farmerId === user.id;
        }
        return false;
      }).length;

      // 6. Kolik zadal poznámek k příležitostem
      let notesCount = 0;
      filteredDeals.forEach(deal => {
        if (deal.notes && Array.isArray(deal.notes)) {
          deal.notes.forEach(n => {
            if (n.createdBy === user.id) notesCount++;
          });
        }
      });

      // 7. Průměrná doba na zpracování příležitosti, než se přepne do jiného stavu
      let totalProcessingMs = 0;
      let transitionEventsCount = 0;

      // 8. Konverzní poměr:
      // Kolik k němu přiřazených příležitostí se přepne do následujícího stavu (nikoliv lost)
      let forwardTransitionsCount = 0;
      const assignedDealIds = new Set<string>();

      filteredDeals.forEach(deal => {
        // Was this deal ever assigned to or handled by this user?
        const isAssigned =
          deal.hunterId === user.id ||
          deal.closerId === user.id ||
          deal.farmerId === user.id ||
          deal.createdBy === user.id;

        if (isAssigned) {
          assignedDealIds.add(deal.id);
        }

        const logs = stageLogsByDeal.get(deal.id) || [];
        let stageEntryTime = deal.createdAt ? new Date(deal.createdAt).getTime() : NaN;

        let hasAdvancedForward = false;

        logs.forEach(log => {
          const logTime = new Date(log.timestamp).getTime();
          const oldStage = log.oldValue as Stage;
          const newStage = log.newValue as Stage;

          // Check if this transition is attributed to this user
          // either user performed it or deal was in a stage owned by user
          const isUserAction =
            log.changedBy === user.id ||
            (deal.hunterId === user.id && (oldStage === 'opportunity' || oldStage === 'lead')) ||
            (deal.closerId === user.id &&
              (oldStage === 'discovery_proposal' ||
                oldStage === 'contracting' ||
                oldStage === 'onboarding')) ||
            (deal.farmerId === user.id && oldStage === 'farming');

          if (isUserAction && !isNaN(stageEntryTime) && !isNaN(logTime) && logTime >= stageEntryTime) {
            const durationMs = logTime - stageEntryTime;
            totalProcessingMs += durationMs;
            transitionEventsCount++;
          }

          // Check for forward transition: next stage (excluding lost)
          if (isAssigned) {
            const oldIndex = STAGE_ORDER.indexOf(oldStage);
            const newIndex = STAGE_ORDER.indexOf(newStage);
            if (newStage !== 'lost' && newIndex > oldIndex) {
              hasAdvancedForward = true;
            }
          }

          stageEntryTime = logTime;
        });

        // Also if current stage is beyond initial opportunity and not lost, count as advanced
        if (isAssigned && deal.stage !== 'lost' && deal.stage !== 'opportunity') {
          hasAdvancedForward = true;
        }

        if (isAssigned && hasAdvancedForward) {
          forwardTransitionsCount++;
        }
      });

      const avgProcessingTimeMs =
        transitionEventsCount > 0 ? totalProcessingMs / transitionEventsCount : null;
      const avgProcessingTimeFormatted =
        avgProcessingTimeMs !== null ? formatDaysAndHours(avgProcessingTimeMs) : '–';

      const totalAssignedDeals = assignedDealIds.size;
      const conversionRatePercent =
        totalAssignedDeals > 0 ? (forwardTransitionsCount / totalAssignedDeals) * 100 : null;

      return {
        user,
        loginsCount,
        dealsCreatedCount,
        activitiesCount,
        attributeUpdatesCount,
        assignedDealsCount,
        notesCount,
        avgProcessingTimeMs,
        avgProcessingTimeFormatted,
        forwardTransitionsCount,
        totalAssignedDeals,
        conversionRatePercent
      };
    });
  }, [accessibleUsers, filteredDeals, filteredDealIdsSet, auditLogs, loginCounts, store.activities]);

  // Filter rows by Selected Role and Selected Users and General Search
  const filteredUserRows = useMemo(() => {
    return userRows.filter(row => {
      // Role filter
      if (selectedRole !== 'all' && row.user.role !== selectedRole) return false;

      // Users multi-option filter
      if (selectedUserIds.length > 0 && !selectedUserIds.includes(row.user.id)) return false;

      // General search filter
      if (generalSearch.trim()) {
        const query = generalSearch.toLowerCase();
        const matchName = row.user.name.toLowerCase().includes(query);
        const matchEmail = row.user.email.toLowerCase().includes(query);
        const matchRole = row.user.role.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchRole) return false;
      }

      return true;
    });
  }, [userRows, selectedRole, selectedUserIds, generalSearch]);

  // Sort rows
  const sortedUserRows = useMemo(() => {
    return [...filteredUserRows].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'user') {
        valA = a.user.name;
        valB = b.user.name;
      }

      if (valA === null || valA === undefined) valA = sortDir === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortDir === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredUserRows, sortKey, sortDir]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedUserRows.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedUserRows.slice(startIndex, startIndex + pageSize);
  }, [sortedUserRows, safeCurrentPage, pageSize]);

  const handleSort = (key: keyof UserKpiRow) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Multi-select user helpers
  const handleToggleUserSelect = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    setCurrentPage(1);
  };

  const handleSelectAllUsers = () => {
    setSelectedUserIds(accessibleUsers.map(u => u.id));
    setCurrentPage(1);
  };

  const handleClearAllUsers = () => {
    setSelectedUserIds([]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedRole !== 'all' ||
    selectedUserIds.length > 0 ||
    selectedCountry !== 'all' ||
    selectedRegion !== 'all' ||
    selectedSegment !== 'all' ||
    dealDateFrom !== '' ||
    dealDateTo !== '' ||
    generalSearch !== '';

  // Summary Metrics calculations
  const totalActiveUsers = sortedUserRows.length;
  const totalDealsCreatedSum = sortedUserRows.reduce((sum, r) => sum + r.dealsCreatedCount, 0);
  const totalActivitiesSum = sortedUserRows.reduce((sum, r) => sum + r.activitiesCount, 0);
  const avgTeamConversion = useMemo(() => {
    const valid = sortedUserRows.filter(r => r.conversionRatePercent !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, r) => acc + (r.conversionRatePercent || 0), 0);
    return sum / valid.length;
  }, [sortedUserRows]);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'hunter':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">Hunter</span>;
      case 'closer':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800">Closer</span>;
      case 'farmer':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">Farmer</span>;
      case 'cso':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 text-purple-800">CSO</span>;
      case 'administrator':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-rose-100 text-rose-800">Admin</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-800">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Scope Notice */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-600" />
              {t('statistics.users.title', 'Statistiky a aktivita uživatelů')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {t('statistics.users.subtitle', 'Komplexní přehled přihlášení, zadaných příležitostí, aktivit, aktualizací, průměrné doby zpracování a konverzí')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scope.isAll && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Všechna firemní data (Role: {currentUser?.role?.toUpperCase()})
              </span>
            )}
            {scope.isManager && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <UsersIcon className="w-3.5 h-3.5" />
                Data týmu a podřízených ({accessibleUsers.length} uživatelů)
              </span>
            )}
            {scope.isRegular && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                Pouze vaše osobní data ({currentUser?.name})
              </span>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">
          <div className="bg-gray-50/70 rounded-lg p-3.5 border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Sledovaní uživatelé</span>
            <div className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <span>{totalActiveUsers}</span>
              <span className="text-xs text-gray-400 font-normal">v zobrazení</span>
            </div>
          </div>

          <div className="bg-gray-50/70 rounded-lg p-3.5 border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Vytvořené příležitosti</span>
            <div className="text-xl font-bold text-indigo-600 mt-1 flex items-center gap-2">
              <span>{totalDealsCreatedSum}</span>
              <span className="text-xs text-gray-400 font-normal">ve filtru</span>
            </div>
          </div>

          <div className="bg-gray-50/70 rounded-lg p-3.5 border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Zadané aktivity</span>
            <div className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
              <span>{totalActivitiesSum}</span>
              <span className="text-xs text-gray-400 font-normal">hovory, schůzky...</span>
            </div>
          </div>

          <div className="bg-gray-50/70 rounded-lg p-3.5 border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Průměrný konverzní poměr</span>
            <div className="text-xl font-bold text-amber-600 mt-1 flex items-center gap-1.5">
              <span>{avgTeamConversion !== null ? `${avgTeamConversion.toFixed(1)}%` : '–'}</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section: Role, Users Multi-Select, Country, Region, Segment, Deal Date From - To */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-gray-900">{t('statistics.filters.title', 'Filtry')}</h3>
            {hasActiveFilters && (
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Aktivní filtry
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('statistics.filters.reset', 'Resetovat filtry')}
            </button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Rychlý výběr vzniku příležitostí:</span>
          <button
            type="button"
            onClick={() => handleQuickPeriod('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              !dealDateFrom && !dealDateTo
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('statistics.filters.allTime', 'Od začátku')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod('12m')}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t('statistics.filters.last12Months', 'Posledních 12 měsíců')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod('thisYear')}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t('statistics.filters.thisYear', 'Tento rok')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod('thisMonth')}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t('statistics.filters.thisMonth', 'Tento měsíc')}
          </button>
        </div>

        {/* Main Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* 1. Role Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('statistics.users.filters.roles', 'Role uživatelů')}
            </label>
            <select
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              disabled={scope.isRegular}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="all">{t('statistics.users.filters.allRoles', 'Všechny role')}</option>
              <option value="hunter">Hunter</option>
              <option value="closer">Closer</option>
              <option value="farmer">Farmer</option>
              <option value="cso">CSO</option>
              <option value="administrator">Administrátor</option>
            </select>
          </div>

          {/* 2. Users Multi-Option Filter */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('statistics.users.filters.usersSelect', 'Uživatelé (výběr více)')}
            </label>
            <button
              type="button"
              disabled={scope.isRegular}
              onClick={() => setUserDropdownOpen(prev => !prev)}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <span className="truncate">
                {scope.isRegular
                  ? currentUser?.name
                  : selectedUserIds.length === 0
                  ? t('statistics.filters.allUsers', 'Všichni uživatelé')
                  : selectedUserIds.length === 1
                  ? accessibleUsers.find(u => u.id === selectedUserIds[0])?.name || '1 uživatel'
                  : `Vybráno (${selectedUserIds.length})`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
            </button>

            {/* Dropdown Popover */}
            {userDropdownOpen && !scope.isRegular && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={userSearchText}
                    onChange={e => setUserSearchText(e.target.value)}
                    placeholder="Hledat uživatele..."
                    className="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between px-1 py-1 mb-1 border-b border-gray-100 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllUsers}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    {t('statistics.users.filters.selectAll', 'Vybrat vše')}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllUsers}
                    className="text-gray-500 hover:text-red-600 hover:underline"
                  >
                    {t('statistics.users.filters.clearAll', 'Zrušit výběr')}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {accessibleUsers
                    .filter(u => u.name.toLowerCase().includes(userSearchText.toLowerCase()) || u.email.toLowerCase().includes(userSearchText.toLowerCase()))
                    .map(u => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleUserSelect(u.id)}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="truncate flex-1 font-medium text-gray-800">{u.name}</span>
                          <span className="text-[10px] text-gray-400 capitalize">{u.role}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Country Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('statistics.filters.country', 'Země')}
            </label>
            <select
              value={selectedCountry}
              onChange={e => {
                setSelectedCountry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('statistics.filters.allCountries', 'Všechny země')}</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Region Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('statistics.filters.region', 'Region')}
            </label>
            <select
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('statistics.filters.allRegions', 'Všechny regiony')}</option>
              {availableRegions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Segment Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('statistics.filters.segment', 'Segment')}
            </label>
            <select
              value={selectedSegment}
              onChange={e => {
                setSelectedSegment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          {/* 6. Date Created OD - DO */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('statistics.filters.periodFrom', 'Od')}
              </label>
              <input
                type="date"
                value={dealDateFrom}
                onChange={e => {
                  setDealDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('statistics.filters.periodTo', 'Do')}
              </label>
              <input
                type="date"
                value={dealDateTo}
                onChange={e => {
                  setDealDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Table Top Controls: Search and Count */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={generalSearch}
                onChange={e => {
                  setGeneralSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rychlé vyhledání uživatele..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              Zobrazeno <strong className="text-gray-900">{sortedUserRows.length}</strong> uživatelů
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
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr className="text-gray-700 select-none">
                {/* 1. Name */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('user')}
                >
                  <div className="flex items-center gap-1">
                    <span>{t('statistics.users.columns.name', 'Jméno')}</span>
                    {sortKey === 'user' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 2. Login */}
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  <span>{t('statistics.users.columns.login', 'Login / E-mail')}</span>
                </th>

                {/* 3. Role */}
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  <span>{t('statistics.users.columns.role', 'Role')}</span>
                </th>

                {/* 4. Logins */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('loginsCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.logins', 'Přihlášení')}</span>
                    {sortKey === 'loginsCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 5. Deals Created */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('dealsCreatedCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.dealsCreated', 'Zadané příležitosti')}</span>
                    {sortKey === 'dealsCreatedCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 6. Activities */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('activitiesCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.activities', 'Zadané aktivity')}</span>
                    {sortKey === 'activitiesCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 7. Attribute Updates */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('attributeUpdatesCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.attributeUpdates', 'Aktualizace atributů')}</span>
                    {sortKey === 'attributeUpdatesCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 8. Currently Assigned */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('assignedDealsCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.currentlyAssigned', 'Aktuálně přiřazeno')}</span>
                    {sortKey === 'assignedDealsCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 9. Notes Count */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('notesCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.notesCount', 'Zadané poznámky')}</span>
                    {sortKey === 'notesCount' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 10. Avg Processing Time */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('avgProcessingTimeMs')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.avgProcessingTime', 'Prům. doba zpracování')}</span>
                    {sortKey === 'avgProcessingTimeMs' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* 11. Conversion Rate */}
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors text-right whitespace-nowrap"
                  onClick={() => handleSort('conversionRatePercent')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('statistics.users.columns.conversionRate', 'Konverzní poměr')}</span>
                    {sortKey === 'conversionRatePercent' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm font-medium">
                      {t('statistics.users.noRecords', 'Nebyli nalezeni žádní uživatelé odpovídající zadaným kritériím.')}
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
                paginatedRows.map(row => {
                  return (
                    <tr key={row.user.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {row.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{row.user.name}</span>
                        </div>
                      </td>

                      {/* Login / Email */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <span className="text-gray-500 font-mono text-[11px]">{row.user.email}</span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 whitespace-nowrap">{getRoleBadge(row.user.role)}</td>

                      {/* Logins */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800 font-mono">
                          {row.loginsCount}
                        </span>
                      </td>

                      {/* Deals Created */}
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600 whitespace-nowrap">
                        {row.dealsCreatedCount > 0 ? (
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                            {row.dealsCreatedCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Activities */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {row.activitiesCount > 0 ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-medium">
                            {row.activitiesCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Attribute Updates */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {row.attributeUpdatesCount > 0 ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-medium">
                            {row.attributeUpdatesCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Currently Assigned */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {row.assignedDealsCount > 0 ? (
                          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                            {row.assignedDealsCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Notes Count */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {row.notesCount > 0 ? (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono font-medium">
                            {row.notesCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Avg Processing Time */}
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        <span className="font-medium">{row.avgProcessingTimeFormatted}</span>
                      </td>

                      {/* Conversion Rate */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {row.conversionRatePercent !== null ? (
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded ${
                                row.conversionRatePercent >= 50
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.conversionRatePercent >= 25
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.conversionRatePercent.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              ({row.forwardTransitionsCount} z {row.totalAssignedDeals})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono">–</span>
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
        <div className="p-3.5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-gray-500 font-medium">
            Zobrazeno{' '}
            <strong className="text-gray-900">
              {sortedUserRows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–
              {Math.min(safeCurrentPage * pageSize, sortedUserRows.length)}
            </strong>{' '}
            z <strong className="text-gray-900">{sortedUserRows.length}</strong> uživatelů
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="První strana"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Předchozí strana"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-gray-700 font-semibold">
              Strana {safeCurrentPage} z {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Další strana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Poslední strana"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
