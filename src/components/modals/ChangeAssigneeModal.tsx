import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Deal } from '../../types';
import { useStore } from '../../store';
import { X, Check, AlertTriangle } from 'lucide-react';
import { STAGES, canViewStage, getSubordinateIds } from '../../lib/permissions';

interface Props {
  deal: Deal;
  onClose: () => void;
}

export function ChangeAssigneeModal({ deal, onClose }: Props) {
  const { t } = useTranslation();
  const { users, currentUser, updateDeal } = useStore();
  const currentAssigneeField = deal.stage === 'lead_opportunity' ? 'hunterId' : (deal.stage === 'discovery_proposal' ? 'closerId' : 'farmerId');
  const currentAssigneeId = deal[currentAssigneeField] || '';
  const [selectedUser, setSelectedUser] = useState<string>(currentAssigneeId);
  const [isSaving, setIsSaving] = useState(false);

  // Determine selectable users
  const selectableUsers = useMemo(() => {
    if (!currentUser) return [];

    const isGlobal = currentUser.role === 'administrator' || currentUser.role === 'cso';
    const subIds = getSubordinateIds(users, currentUser.id);

    return users.filter(user => {
      // Exclude current assignee
      if (user.id === currentAssigneeId) return false;
      if (!user.isActive) return false;

      const hasStagePerm = canViewStage(user, deal.stage);
      if (!hasStagePerm) return false;

      if (isGlobal) {
        return true;
      } else {
        return subIds.includes(user.id);
      }
    });

  }, [users, currentUser, currentAssigneeId, deal.stage]);

  const willAdvanceToDiscovery = deal.stage === 'lead_opportunity' &&
    currentAssigneeField === 'hunterId' &&
    selectedUser !== '' &&
    deal.leadSourceId &&
    deal.ecommercePlatformId &&
    deal.estimatedMonthlyParcels &&
    deal.estimatedMonthlyParcels > 0;

  const willAdvanceToContracting = deal.stage === 'discovery_proposal' &&
    currentAssigneeField === 'closerId' &&
    selectedUser !== '' &&
    deal.deliveryCountries && deal.deliveryCountries.length > 0 &&
    deal.averageItemsPerOrder && deal.averageItemsPerOrder > 0 &&
    deal.averageParcelWeight && deal.averageParcelWeight > 0 &&
    deal.averageParcelVolume && deal.averageParcelVolume > 0 &&
    deal.pricingOffers && deal.pricingOffers.length > 0;

  const willAdvanceToOnboarding = deal.stage === 'contracting' &&
    currentAssigneeField === 'closerId' &&
    selectedUser !== '' &&
    deal.contractSignedDate &&
    deal.pricingUploadedDate &&
    deal.itIntegrationId &&
    deal.firstStockingDate;

  const willAdvance = willAdvanceToDiscovery || willAdvanceToContracting || willAdvanceToOnboarding;

  const handleSave = async () => {
    if (!currentUser) return;
    if (selectedUser === currentAssigneeId) {
      onClose();
      return;
    }
    
    setIsSaving(true);
    try {
      const updates: Partial<Deal> = { [currentAssigneeField]: selectedUser === '' ? null : selectedUser };
      
      // Auto promote if all required fields are set
      if (willAdvanceToDiscovery) {
        updates.stage = 'discovery_proposal';
      } else if (willAdvanceToContracting) {
        updates.stage = 'contracting';
      } else if (willAdvanceToOnboarding) {
        updates.stage = 'onboarding';
      }

      await updateDeal(deal.id, updates, currentUser.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const showUnassignOption = (deal.stage === 'lead_opportunity' || deal.stage === 'lost') && currentAssigneeId;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 flex flex-col items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Změna řešitele ({currentAssigneeField.replace('Id', '')})</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto w-full">
          {willAdvance && (
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Přiřazením bude příležitost automaticky posunuta do fáze <strong>{willAdvanceToDiscovery ? t('stages.discovery_proposal') : willAdvanceToContracting ? t('stages.contracting', 'Contracting') : t('stages.onboarding', 'Onboarding')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
          {selectableUsers.length === 0 && !showUnassignOption ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenalezeni žádní další řešitelé pro tento stav.</p>
          ) : (
            <div className="space-y-2">
              {showUnassignOption && (
                <button
                  onClick={() => setSelectedUser('')}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-colors ${
                    selectedUser === '' 
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">Bez řešitele</div>
                    <div className="text-xs text-gray-500 uppercase">Odebrat aktuálního řešitele</div>
                  </div>
                  {selectedUser === '' && (
                    <Check className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              )}
              {selectableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-colors ${
                    selectedUser === user.id 
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 uppercase">{user.role}</div>
                  </div>
                  {selectedUser === user.id && (
                    <Check className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="button"
            disabled={selectedUser === currentAssigneeId || isSaving}
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Ukládám...' : 'Uložit'}
          </button>
        </div>
      </div>
    </div>
  );
}
