import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Layers, 
  Users, 
  GitCommit,
  XCircle
} from 'lucide-react';
import { OpportunitiesKpiView } from './statistics/OpportunitiesKpiView';
import { UsersKpiView } from './statistics/UsersKpiView';
import { StagesKpiView } from './statistics/StagesKpiView';
import { LostKpiView } from './statistics/LostKpiView';
import { useStore } from '../../store';

type KpiSubTab = 'opportunities' | 'users' | 'stages' | 'lost';

export function StatisticsView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<KpiSubTab>('opportunities');
  const { deals } = useStore();

  const subTabs: { id: KpiSubTab; label: string; icon: React.ElementType }[] = [
    {
      id: 'opportunities',
      label: t('statistics.tabs.opportunities', 'Příležitosti'),
      icon: Layers
    },
    {
      id: 'users',
      label: t('statistics.tabs.users', 'Uživatelé'),
      icon: Users
    },
    {
      id: 'stages',
      label: t('statistics.tabs.stages', 'Stavy'),
      icon: GitCommit
    },
    {
      id: 'lost',
      label: t('statistics.tabs.lost', 'Ztracené'),
      icon: XCircle
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            {t('statistics.title', 'Statistiky a KPI')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('statistics.subtitle', 'Klíčové ukazatele výkonnosti a analýza obchodního trychtýře')}
          </p>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6" aria-label="KPI Tabs">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`kpi-subtab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-colors relative ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-tab content */}
      <div className="mt-4">
        {activeTab === 'opportunities' && <OpportunitiesKpiView />}
        {activeTab === 'users' && <UsersKpiView />}
        {activeTab === 'stages' && <StagesKpiView />}
        {activeTab === 'lost' && <LostKpiView />}
      </div>
    </div>
  );
}
