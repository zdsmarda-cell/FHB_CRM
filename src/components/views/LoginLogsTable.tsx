import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Globe, Fingerprint } from 'lucide-react';
import { apiFetch } from '../../store';

interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  ip: string | null;
  resolvedHost: string | null;
}

export function LoginLogsTable() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [userName, setUserName] = useState('');
  
  // Throttle search
  const [debouncedUserName, setDebouncedUserName] = useState('');
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUserName(userName);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [userName]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.append('page', page.toString());
      query.append('limit', limit.toString());
      if (debouncedUserName) query.append('userName', debouncedUserName);

      const res = await apiFetch(`/api/login_logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch login logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, debouncedUserName]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{t('admin.loginLogsFilter', 'Filtrace')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.userName', 'Uživatel')}</label>
            <div className="relative">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t('admin.searchUserName', 'Hledat podle jména...')}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.perPage', 'Záznamů na stránku')}</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border text-gray-800 border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.userName', 'Uživatel')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.userId', 'ID Uživatele')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.timestamp', 'Čas Přihlášení')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.ipAddress', 'IP Adresa')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.resolvedHost', 'Host')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                       <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    {t('admin.loading', 'Načítání...')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {t('admin.noLoginLogsFound', 'Nebyly nalezeny žádné záznamy o přihlášení.')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.userName || t('common.unknownUser', 'Neznámý uživatel')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-xs text-gray-500 font-mono">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.timestamp ? format(parseISO(log.timestamp), 'dd.MM.yyyy HH:mm:ss') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-mono">
                        <Fingerprint className="w-3.5 h-3.5 text-gray-400" />
                        {log.ip || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[200px]" title={log.resolvedHost || undefined}>
                          {log.resolvedHost || '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination control */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('common.showing', 'Zobrazeno')} <span className="font-medium">{logs.length > 0 ? (page - 1) * limit + 1 : 0}</span> {t('common.to', 'až')} <span className="font-medium">{Math.min(page * limit, total)}</span> {t('common.of', 'z')} <span className="font-medium">{total}</span> {t('common.results', 'záznamů')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="p-1 px-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('common.prev', 'Předchozí')}
            </button>
            <span className="text-sm font-medium text-gray-700 mx-2">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="p-1 px-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm"
            >
              {t('common.next', 'Další')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
