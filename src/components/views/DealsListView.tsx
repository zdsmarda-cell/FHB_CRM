import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Company, Deal } from '../../types';
import { Eye, EyeOff, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { AlertModal } from '../modals/AlertModal';
import { COUNTRIES } from '../../lib/countryMapping';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDealsForUser, STAGES } from '../../lib/permissions';

export function DealsListView() {
  const { t } = useTranslation();
  const store = useStore();
  const { companies, deals, updateCompany, currentUser, segments } = store;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 10;
  
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });

  // Filters
  const searchTerm = searchParams.get('search') || '';
  const selectedCountries = searchParams.getAll('country');
  const selectedStages = searchParams.getAll('stage');
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [showStageFilter, setShowStageFilter] = useState(false);

  const SearchParams = searchParams; // helper to preserve refs if needed

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else direction = null;
    }
    setSortConfig(direction ? { key, direction } : null);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) return null;
    if (sortConfig.direction === 'asc') return <ArrowUp className="w-4 h-4 ml-1 inline-block" />;
    return <ArrowDown className="w-4 h-4 ml-1 inline-block" />;
  };

  const updateParams = (updates: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.delete(key);
        value.forEach(v => newParams.append(key, v));
      } else {
        newParams.set(key, value.toString());
      }
    });
    setSearchParams(newParams);
  };

  const setCurrentPage = (page: number | ((p: number) => number)) => {
    const newPage = typeof page === 'function' ? page(currentPage) : page;
    updateParams({ page: newPage });
  };

  const setSearchTerm = (term: string) => updateParams({ search: term, page: 1 });

  // Apply filters
  const filteredDeals = useMemo(() => {
    let userDeals = getDealsForUser(store, currentUser);
    
    // Filter out deals where company is explicitly marked as not visible, 
    // unless the user is admin
    userDeals = userDeals.filter(d => {
      const company = companies.find(c => c.id === d.companyId);
      if (!company) return false;
      if (currentUser?.role === 'administrator') return true;
      return company.isVisible !== false;
    });

    if (store.kanbanUserFilter) {
      userDeals = userDeals.filter(d => 
        d.hunterId === store.kanbanUserFilter || 
        d.closerId === store.kanbanUserFilter || 
        d.farmerId === store.kanbanUserFilter
      );
    }

    return userDeals.filter(d => {
      const c = companies.find(c => c.id === d.companyId);
      if (!c) return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchLower) || 
        c.companyId.toLowerCase().includes(searchLower);
      
      const matchesCountry = selectedCountries.length === 0 || 
        selectedCountries.includes(c.country || 'Czechia');

      const matchesStage = selectedStages.length === 0 ||
        selectedStages.includes(d.stage);

      return matchesSearch && matchesCountry && matchesStage;
    });
  }, [store, currentUser, companies, searchTerm, selectedCountries, selectedStages]);

  const sortedDeals = useMemo(() => {
    let sortableDeals = [...filteredDeals];
    if (sortConfig !== null) {
      sortableDeals.sort((a, b) => {
        const companyA = companies.find(c => c.id === a.companyId);
        const companyB = companies.find(c => c.id === b.companyId);
        if (!companyA || !companyB) return 0;
        
        let aValue: any = '';
        let bValue: any = '';
        
        switch (sortConfig.key) {
          case 'name':
            aValue = companyA.name;
            bValue = companyB.name;
            break;
          case 'ico':
            aValue = companyA.companyId;
            bValue = companyB.companyId;
            break;
          case 'country':
            aValue = companyA.country || 'Czechia';
            bValue = companyB.country || 'Czechia';
            break;
          case 'segment':
            aValue = companyA.segment || '';
            bValue = companyB.segment || '';
            break;
          case 'stage':
            aValue = t(`stages.${a.stage}`);
            bValue = t(`stages.${b.stage}`);
            break;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableDeals;
  }, [filteredDeals, sortConfig, companies, t]);

  const totalPages = Math.ceil(sortedDeals.length / itemsPerPage);

  const currentDeals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDeals.slice(start, start + itemsPerPage);
  }, [sortedDeals, currentPage]);

  const handleToggleVisibility = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation();
    if (!currentUser) return;
    updateCompany(company.id, { isVisible: company.isVisible === false ? true : false }, currentUser.id);
  };

  const handleCountryToggle = (country: string) => {
    const newCountries = selectedCountries.includes(country) 
      ? selectedCountries.filter(c => c !== country) 
      : [...selectedCountries, country];
    updateParams({ country: newCountries, page: 1 });
  };

  const handleStageToggle = (stage: string) => {
    const newStages = selectedStages.includes(stage) 
      ? selectedStages.filter(s => s !== stage) 
      : [...selectedStages, stage];
    updateParams({ stage: newStages, page: 1 });
  };

  const handleRowClick = (dealId: string) => {
    navigate(`/deal/${dealId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 flex-wrap items-start sm:items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.searchCompanyPlaceholder', 'Hledat společnost...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        
        <div className="flex gap-2 relative">
          <div className="relative">
            <button
              onClick={() => { setShowStageFilter(!showStageFilter); setShowCountryFilter(false); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${selectedStages.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              {t('common.stage', 'Stav')} {selectedStages.length > 0 && `(${selectedStages.length})`}
            </button>
            
            {showStageFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStageFilter(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{t('common.filterByStage', 'Filtrovat podle stavu')}</div>
                  {STAGES.map(stage => (
                    <label key={stage} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStages.includes(stage)}
                        onChange={() => handleStageToggle(stage)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{t(`stages.${stage}`)}</span>
                    </label>
                  ))}
                  <label key="lost" className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer border-t border-gray-100 mt-1 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedStages.includes('lost')}
                      onChange={() => handleStageToggle('lost')}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{t('stages.lost')}</span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowCountryFilter(!showCountryFilter); setShowStageFilter(false); }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${selectedCountries.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              {t('fields.country')} {selectedCountries.length > 0 && `(${selectedCountries.length})`}
            </button>
            
            {showCountryFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCountryFilter(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{t('admin.filterByCountry')}</div>
                  {COUNTRIES.map(country => (
                    <label key={country} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country)}
                        onChange={() => handleCountryToggle(country)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{country}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky top-0 z-0">
            <tr>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>
                {t('admin.name')} {renderSortIcon('name')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => requestSort('ico')}>
                {t('fields.ico')} {renderSortIcon('ico')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => requestSort('country')}>
                {t('fields.country')} {renderSortIcon('country')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => requestSort('segment')}>
                {t('fields.segment')} {renderSortIcon('segment')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => requestSort('stage')}>
                {t('common.stage', 'Stav')} {renderSortIcon('stage')}
              </th>
              {currentUser?.role === 'administrator' && (
                <th className="px-6 py-4 font-medium">{t('admin.visibility')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentDeals.length === 0 ? (
              <tr>
                <td colSpan={currentUser?.role === 'administrator' ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                  {t('admin.noRecords')}
                </td>
              </tr>
            ) : (
              currentDeals.map(deal => {
                const company = companies.find(c => c.id === deal.companyId);
                if (!company) return null;

                return (
                  <tr 
                    key={deal.id} 
                    className="hover:bg-indigo-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(deal.id)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 text-gray-500">{company.companyId}</td>
                    <td className="px-6 py-4 text-gray-500">{company.country || 'Czechia'}</td>
                    <td className="px-6 py-4 text-gray-500">{company.segment ? (segments.find(s => s.id === company.segment)?.name || company.segment.charAt(0).toUpperCase() + company.segment.slice(1)) : ''}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{t(`stages.${deal.stage}`)}</td>
                    {currentUser?.role === 'administrator' && (
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => handleToggleVisibility(e, company)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${company.isVisible !== false ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                          {company.isVisible !== false ? (
                            <><Eye className="w-3.5 h-3.5" /> {t('admin.visible')}</>
                          ) : (
                            <><EyeOff className="w-3.5 h-3.5" /> {t('admin.hidden')}</>
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 mt-auto">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
          >
            {t('common.prev', 'Previous')}
          </button>
          <span className="text-sm text-gray-600">{t('common.pageOf', { current: currentPage, total: totalPages, defaultValue: `Page ${currentPage} of ${totalPages}` })}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      )}

      <AlertModal 
        isOpen={alertInfo.isOpen}
        onClose={() => setAlertInfo({ ...alertInfo, isOpen: false })}
        title={alertInfo.title}
        message={alertInfo.message}
      />
    </div>
  );
}
