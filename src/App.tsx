import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KanbanBoard } from './components/views/KanbanBoard';
import { AdminPanel } from './components/views/AdminPanel';
import { DealDetailsView } from './components/views/DealDetailsView';
import { Header } from './components/layout/Header';
import { LayoutDashboard, Users } from 'lucide-react';
import { cn } from './lib/utils';
import { getSubordinateIds } from './lib/permissions';
import { useStore } from './store';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Login } from './components/auth/Login';
import { ResetPassword } from './components/auth/ResetPassword';

function MainLayout() {
  const { t } = useTranslation();
  const { currentUser, checkPostponedDeals, kanbanUserFilter, setKanbanUserFilter, users } = useStore();
  const location = useLocation();

  useEffect(() => {
    // Check initially when the app loads
    const store = useStore.getState();
    store.refreshState().then(() => store.checkPostponedDeals());

    // Check periodically (every minute)
    const interval = setInterval(() => {
      store.refreshState().then(() => store.checkPostponedDeals());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const subordinateIds = getSubordinateIds(users, currentUser.id);
  const canFilterUsers = currentUser.role === 'administrator' || currentUser.role === 'cso' || subordinateIds.length > 0;

  const navItems = [
    { path: '/', label: t('menu.board'), icon: LayoutDashboard },
  ];

  if (currentUser.role === 'administrator' || currentUser.role === 'cso') {
    navItems.push({ path: '/admin', label: t('menu.admin'), icon: Users });
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 mt-0 items-center justify-between">
        <div className="flex gap-6">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/deal'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => useStore.getState().refreshState()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
        
        {canFilterUsers && location.pathname === '/' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">{t('common.userFilter')}</span>
            <select
              value={kanbanUserFilter || ''}
              onChange={(e) => setKanbanUserFilter(e.target.value || null)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-w-[200px]"
            >
              <option value="">{t('common.all')}</option>
              {users.filter(u => u.isActive).map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}
      </nav>
      
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<KanbanBoard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/deal/:id" element={<DealDetailsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { isInitialized } = useStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-medium text-gray-500">
        Načítám...
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </HashRouter>
  );
}
