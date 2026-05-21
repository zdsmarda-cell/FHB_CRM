import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Company } from '../../types';
import { Edit2, Eye, EyeOff, Search, Filter } from 'lucide-react';
import { AdminCompanyModal } from '../modals/AdminCompanyModal';
import { AlertModal } from '../modals/AlertModal';
import { COUNTRIES } from '../../lib/countryMapping';

export function AdminCompaniesTable() {
  const { t } = useTranslation();
  const store = useStore();
  const { companies, updateCompany, currentUser } = store;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: '', message: '' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showCountryFilter, setShowCountryFilter] = useState(false);

  // Apply filters
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchLower) || 
        c.companyId.toLowerCase().includes(searchLower);
      
      const matchesCountry = selectedCountries.length === 0 || 
        selectedCountries.includes(c.country || 'Czechia');

      return matchesSearch && matchesCountry;
    });
  }, [companies, searchTerm, selectedCountries]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  const currentCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  const handleToggleVisibility = (company: Company) => {
    if (!currentUser) return;
    updateCompany(company.id, { isVisible: company.isVisible === false ? true : false }, currentUser.id);
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.searchCompanyPlaceholder')}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowCountryFilter(!showCountryFilter)}
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

      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky top-0 z-0">
            <tr>
              <th className="px-6 py-4 font-medium">{t('admin.name')}</th>
              <th className="px-6 py-4 font-medium">{t('fields.ico')}</th>
              <th className="px-6 py-4 font-medium">{t('fields.country')}</th>
              <th className="px-6 py-4 font-medium">{t('fields.segment')}</th>
              <th className="px-6 py-4 font-medium">{t('admin.status')} ({t('admin.visibility')})</th>
              <th className="px-6 py-4 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {t('admin.noRecords')}
                </td>
              </tr>
            ) : (
              currentCompanies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 text-gray-500">{company.companyId}</td>
                  <td className="px-6 py-4 text-gray-500">{company.country || 'Czechia'}</td>
                  <td className="px-6 py-4 text-gray-500">{t(`fields.segment`) + ': ' + company.segment}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleVisibility(company)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${company.isVisible !== false ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {company.isVisible !== false ? (
                        <><Eye className="w-3.5 h-3.5" /> {t('admin.visible')}</>
                      ) : (
                        <><EyeOff className="w-3.5 h-3.5" /> {t('admin.hidden')}</>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingCompany(company)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
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
            {t('admin.previous')}
          </button>
          <span className="text-sm text-gray-600">{t('admin.pageOf', { current: currentPage, total: totalPages })}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
          >
            {t('admin.next')}
          </button>
        </div>
      )}

      {editingCompany && (
        <AdminCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSaveSuccess={() => {
            setEditingCompany(null);
            setAlertInfo({ 
              isOpen: true, 
              title: t('admin.companyUpdatedTitle'), 
              message: t('admin.companyUpdatedMessage') 
            });
          }}
        />
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
