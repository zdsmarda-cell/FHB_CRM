import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Company } from '../../types';
import { Edit2, Eye, EyeOff } from 'lucide-react';
import { AdminCompanyModal } from '../modals/AdminCompanyModal';

export function AdminCompaniesTable() {
  const { t } = useTranslation();
  const store = useStore();
  const { companies, updateCompany, currentUser } = store;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const totalPages = Math.ceil(companies.length / itemsPerPage);
  
  const currentCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return companies.slice(start, start + itemsPerPage);
  }, [companies, currentPage]);

  const handleToggleVisibility = (company: Company) => {
    if (!currentUser) return;
    updateCompany(company.id, { isVisible: company.isVisible === false ? true : false }, currentUser.id);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 font-medium">{t('admin.name')}</th>
            <th className="px-6 py-4 font-medium">{t('fields.ico')}</th>
            <th className="px-6 py-4 font-medium">{t('fields.segment')}</th>
            <th className="px-6 py-4 font-medium">{t('admin.status')} (Viditelnost)</th>
            <th className="px-6 py-4 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {currentCompanies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                {t('admin.noRecords')}
              </td>
            </tr>
          ) : (
            currentCompanies.map(company => (
              <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{company.name}</td>
                <td className="px-6 py-4 text-gray-500">{company.companyId}</td>
                <td className="px-6 py-4 text-gray-500">{t(`fields.segment`) + ': ' + company.segment}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleVisibility(company)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${company.isVisible !== false ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {company.isVisible !== false ? (
                      <><Eye className="w-3.5 h-3.5" /> Viditelná</>
                    ) : (
                      <><EyeOff className="w-3.5 h-3.5" /> Skrytá</>
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

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
          >
            Předchozí
          </button>
          <span className="text-sm text-gray-600">Stránka {currentPage} z {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
          >
            Další
          </button>
        </div>
      )}

      {editingCompany && (
        <AdminCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
        />
      )}
    </div>
  );
}
