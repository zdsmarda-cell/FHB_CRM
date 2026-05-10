import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KanbanBoard } from './components/views/KanbanBoard';
import { AdminPanel } from './components/views/AdminPanel';
import { DealDetailsView } from './components/views/DealDetailsView';
import { Header } from './components/layout/Header';
import { LayoutDashboard, Users } from 'lucide-react';
import { cn } from './lib/utils';
import { useStore } from './store';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Login } from './components/auth/Login';
import { ResetPassword } from './components/auth/ResetPassword';

function MainLayout() {
  const { t } = useTranslation();
  const { currentUser, checkPostponedDeals } = useStore();
  const location = useLocation();

  useEffect(() => {
    // Check initially when the app loads
    checkPostponedDeals();

    // Check periodically (every minute)
    const interval = setInterval(() => {
      checkPostponedDeals();
    }, 60000);

    return () => clearInterval(interval);
  }, [checkPostponedDeals]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

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
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/deal'));
          return (
            <Link
              key={item.path}
              to={item.path}
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
