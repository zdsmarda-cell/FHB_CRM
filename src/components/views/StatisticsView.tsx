import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Target, 
  Layers, 
  TrendingUp, 
  Users, 
  Calendar,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { OpportunitiesKpiView } from './statistics/OpportunitiesKpiView';
import { UsersKpiView } from './statistics/UsersKpiView';
import { useStore } from '../../store';

type KpiSubTab = 'opportunities' | 'users' | 'conversions' | 'performance';

export function StatisticsView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<KpiSubTab>('opportunities');
  const { deals } = useStore();

  const subTabs: { id: KpiSubTab; label: string; icon: React.ElementType; isReady?: boolean }[] = [
    {
      id: 'opportunities',
      label: t('statistics.tabs.opportunities', 'Příležitosti'),
      icon: Layers,
      isReady: true
    },
    {
      id: 'users',
      label: t('statistics.tabs.users', 'Uživatelé'),
      icon: Users,
      isReady: true
    },
    {
      id: 'conversions',
      label: t('statistics.tabs.conversions', 'Konverze'),
      icon: TrendingUp,
      isReady: false
    },
    {
      id: 'performance',
      label: t('statistics.tabs.performance', 'Výkonnost týmu'),
      icon: Target,
      isReady: false
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
                {!tab.isReady && (
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                    {t('statistics.tabs.comingSoon', 'V přípravě')}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-tab content */}
      <div className="mt-4">
        {activeTab === 'opportunities' && <OpportunitiesKpiView />}

        {activeTab === 'users' && <UsersKpiView />}

        {activeTab === 'conversions' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {t('statistics.tabs.conversions', 'Konverze')}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Tato sekce bude obsahovat pokročilý trychtýř konverzí mezi jednotlivými fázemi (Příležitost → Lead → Discovery → Contracting → Farming).
            </p>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Přejít na Příležitosti
            </button>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {t('statistics.tabs.performance', 'Výkonnost týmu')}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Tato sekce bude obsahovat porovnání výkonu jednotlivých obchodníků, hunterů, closerů a farmerů v čase.
            </p>
            <button
              onClick={() => setActiveTab('opportunities')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Přejít na Příležitosti
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
