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
  const { updateDeal, currentUser } = useStore();
  const [lostReason, setLostReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser || !lostReason.trim()) return;
    setIsSaving(true);
    try {
      await updateDeal(dealId, {
        stage: 'lost',
        lostPermanently: true,
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
          <h2 className="text-lg font-semibold text-red-800">Důvod ztráty / Reason for Loss</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Prosím, zadejte důvod, proč byla tato příležitost přesunuta do Lost. Důvod je povinný. / Please enter the reason why this deal was moved to Lost. The reason is required.
          </p>
          <div>
            <label className="block text-sm font-medium text-red-800 mb-1">Reason *</label>
            <textarea 
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white shadow-sm"
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
            Cancel
          </button>
          <button 
            type="button"
            disabled={!lostReason.trim() || isSaving}
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Ukládám...' : 'Confirm Loss'}
          </button>
        </div>
      </div>
    </div>
  );
}
