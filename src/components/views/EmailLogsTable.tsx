import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../store';

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  sentAt: string;
}

export function EmailLogsTable() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.append('page', page.toString());
      query.append('limit', limit.toString());
      if (dateFrom) query.append('dateFrom', dateFrom);
      if (dateTo) query.append('dateTo', dateTo);
      if (recipient) query.append('recipient', recipient);
      if (subject) query.append('subject', subject);
      if (status !== 'all') query.append('status', status);

      const res = await apiFetch(`/api/email_logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, dateFrom, dateTo, recipient, subject, status]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.dateFrom')}</label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.dateTo')}</label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('auth.email')}</label>
          <input 
            type="text" 
            placeholder={t('admin.searchRecipient')}
            value={recipient} 
            onChange={e => { setRecipient(e.target.value); setPage(1); }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-48"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Předmět / Subject</label>
          <input 
            type="text" 
            placeholder={t('admin.searchSubject')}
            value={subject} 
            onChange={e => { setSubject(e.target.value); setPage(1); }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 w-48"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.status')}</label>
          <select 
            value={status} 
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Vše / All</option>
            <option value="sent">Sent</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">Datum a čas</th>
              <th className="px-6 py-4 font-medium">Příjemce</th>
              <th className="px-6 py-4 font-medium">Předmět</th>
              <th className="px-6 py-4 font-medium">Stav</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Načítání...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Žádné záznamy</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-900">
                  {format(new Date(log.sentAt), 'dd.MM.yyyy HH:mm:ss')}
                </td>
                <td className="px-6 py-4 text-gray-600">{log.recipient}</td>
                <td className="px-6 py-4 text-gray-900 font-medium truncate max-w-[300px]" title={log.subject}>
                  {log.subject}
                </td>
                <td className="px-6 py-4">
                  {log.status === 'sent' ? (
                    <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Sent
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-700 text-xs font-medium" title={log.error || 'Error'}>
                      <XCircle className="w-4 h-4 text-red-500" />
                      Error
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-500">
              Celkem {total} záznamů
            </div>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1 rounded bg-white border border-gray-300 disabled:opacity-50 text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-1 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1 rounded bg-white border border-gray-300 disabled:opacity-50 text-gray-600 hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
