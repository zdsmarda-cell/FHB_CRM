import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { Deal } from '../../types';

interface Props {
  dealId: string;
  onClose: () => void;
}

export function LostDealModal({ dealId, onClose }: Props) {
  const { t } = useTranslation();
  const { updateDeal, currentUser, lostReasons } = useStore();
  const [lostReason, setLostReason] = useState('');
  const [lostReasonId, setLostReasonId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser || !lostReasonId) return;
    setIsSaving(true);
    try {
      await updateDeal(dealId, {
        stage: 'lost',
        lostPermanently: true,
        lostReasonId,
        lostReason: lostReason.trim(),
        lostBy: currentUser.id,
        lostAt: new Date().toISOString(),
        postponedUntil: undefined,
        postponedReason: undefined,
        postponedBy: undefined,
        postponedAt: undefined
      }, currentUser.id);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-red-800">{t('deal.loss.title')}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            {t('deal.loss.description')}
          </p>
          <div>
            <label className="block text-sm font-medium text-red-800 mb-1">{t('deal.loss.reasonLabel')}</label>
            <select
              value={lostReasonId}
              onChange={e => setLostReasonId(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white shadow-sm mb-4"
            >
              <option value="">{t('deal.attributes.notSelected')}</option>
              {lostReasons.filter(r => r.isActive).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('deal.loss.noteLabel')}</label>
            <textarea 
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm"
              rows={3}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="button"
            disabled={!lostReasonId || isSaving}
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('deal.loss.saving') : t('deal.loss.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
