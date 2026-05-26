import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { StoreState, User, Company, Deal, AuditLog, Stage } from './types';

// Simple mockup hash function to simulate "encrypted in DB"
export const hashPassword = (password: string) => btoa(encodeURIComponent(password + '_secret_salt'));

const DEFAULT_PASS = hashPassword('password123');

export const CLIENT_ID = uuidv4();

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  let token = localStorage.getItem('jwt_token');
  const headers = new Headers(options.headers || {});
  
  if (url !== '/api/auth/refresh-session' && url !== '/api/auth/login') {
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Client-Id', CLIENT_ID);
    options.headers = headers;
  }
  
  let res = await fetch(url, options);

  if (res.status === 401 && url !== '/api/auth/login' && url !== '/api/auth/refresh-session') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = fetch('/api/auth/refresh-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        }).then(async refreshRes => {
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('jwt_token', data.token);
            localStorage.setItem('refresh_token', data.refreshToken);
            useStore.setState({ currentUser: data.user });
            return true;
          }
          return false;
        }).finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }
      
      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry original request
        const newToken = localStorage.getItem('jwt_token');
        const retryHeaders = new Headers(options.headers || {});
        if (newToken) retryHeaders.set('Authorization', `Bearer ${newToken}`);
        retryHeaders.set('X-Client-Id', CLIENT_ID);
        options.headers = retryHeaders;
        res = await fetch(url, options);
      } else {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('refresh_token');
        useStore.setState({ currentUser: null });
      }
    } else {
      localStorage.removeItem('jwt_token');
      useStore.setState({ currentUser: null });
    }
  }

  return res;
};

export const formatAuditValue = (state: StoreState, field: string, val: any): string => {
  if (val === null || val === undefined || val === '') return String(val);
  let name = '';
  if (['hunterId', 'closerId', 'farmerId', 'ownerId', 'postponedBy', 'lostBy', 'doNotContactBy', 'createdBy'].includes(field)) {
    name = state.users.find(u => u.id === val)?.name || '';
  } else if (field === 'leadSourceId') {
    name = state.leadSources.find(s => s.id === val)?.name || '';
  } else if (field === 'ecommercePlatformId') {
    name = state.ecommercePlatforms.find(s => s.id === val)?.name || '';
  } else if (field === 'itIntegrationId') {
    name = state.itIntegrations.find(s => s.id === val)?.name || '';
  } else if (field === 'lostReasonId') {
    name = state.lostReasons.find(s => s.id === val)?.name || '';
  }

  if (name) {
    return `${name} (ID: ${val})`;
  }
  return String(val);
};

export const useStore = create<StoreState>((set, get) => {
  // Try loading initial state from DB after a small delay
  setTimeout(async () => {
    try {
      const res = await apiFetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        set({
          isInitialized: true,
          users: data.users || [],
          companies: data.companies || [],
          deals: data.deals || [],
          leadSources: data.leadSources || [],
          ecommercePlatforms: data.ecommercePlatforms || [],
          itIntegrations: data.itIntegrations || [],
          lostReasons: data.lostReasons || [],
          auditLogs: data.auditLogs || [],
          activities: data.activities || [],
          currentUser: data.me || null
        });
      } else {
        throw new Error('Failed to fetch from DB');
      }
    } catch (err) {
      console.warn('DB state not available', err);
      // Empty state if DB fails
      set({
        isInitialized: true,
        users: [],
        companies: [],
        deals: [],
        auditLogs: [],
        activities: [],
        currentUser: null
      });
    }
  }, 10);

  // Helper function to sync with DB
  const syncToDb = async (entities: Record<string, any[]>) => {
    const res = await apiFetch('/api/sync-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entities })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to sync to DB');
    }
  };

  return {
    refreshState: async () => {
      try {
        const res = await apiFetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          set((state) => ({
            users: data.users || [],
            companies: data.companies || [],
            deals: data.deals || [],
            leadSources: data.leadSources || [],
            ecommercePlatforms: data.ecommercePlatforms || [],
            itIntegrations: data.itIntegrations || [],
            lostReasons: data.lostReasons || [],
            auditLogs: data.auditLogs && data.auditLogs.length > 0 ? data.auditLogs : state.auditLogs,
            activities: data.activities && data.activities.length > 0 ? data.activities : state.activities,
            currentUser: data.me || null // keep matching data.me
          }));
        }
      } catch (err) {
        console.warn('DB state not available', err);
      }
    },
    fetchDealDetails: async (dealId: string) => {
      try {
        const res = await apiFetch(`/api/deals/${dealId}/details`);
        if (res.ok) {
          const data = await res.json();
          set(state => ({
            auditLogs: [
              ...state.auditLogs.filter(log => log.dealId !== dealId),
              ...(data.auditLogs || [])
            ],
            activities: [
              ...state.activities.filter(activity => activity.dealId !== dealId),
              ...(data.activities || [])
            ]
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch deal details', err);
      }
    },
    isInitialized: false,
    users: [],
    companies: [],
    deals: [],
    leadSources: [],
    ecommercePlatforms: [],
    itIntegrations: [],
    lostReasons: [],
    auditLogs: [],
    activities: [],
    notifications: [],
    currentUser: null,
    
    kanbanUserFilter: null,
    setKanbanUserFilter: (userId) => set({ kanbanUserFilter: userId }),

    addLeadSource: async (name) => {
      const newSource = { id: uuidv4(), name, isActive: true };
      await syncToDb({ lead_sources: [newSource] });
      set(state => ({ leadSources: [...state.leadSources, newSource] }));
    },
    updateLeadSource: async (id, updates) => {
      const state = get();
      const existing = state.leadSources.find(s => s.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ lead_sources: [updated] });
      set(state => ({
        leadSources: state.leadSources.map(s => s.id === id ? updated : s)
      }));
    },
    deleteLeadSource: async (id) => {
      await apiFetch('/api/delete-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'lead_sources', id })
      }).then(async (res) => {
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Failed to delete');
        }
      });
      set(state => ({
        leadSources: state.leadSources.filter(s => s.id !== id)
      }));
    },
    addEcommercePlatform: async (name) => {
      const newPlatform = { id: uuidv4(), name, isActive: true };
      await syncToDb({ ecommerce_platforms: [newPlatform] });
      set(state => ({ ecommercePlatforms: [...state.ecommercePlatforms, newPlatform] }));
    },
    updateEcommercePlatform: async (id, updates) => {
      const state = get();
      const existing = state.ecommercePlatforms.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ ecommerce_platforms: [updated] });
      set(state => ({
        ecommercePlatforms: state.ecommercePlatforms.map(s => s.id === id ? updated : s)
      }));
    },
    deleteEcommercePlatform: async (id) => {
      await apiFetch('/api/delete-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'ecommerce_platforms', id })
      }).then(async (res) => {
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Failed to delete');
        }
      });
      set(state => ({
        ecommercePlatforms: state.ecommercePlatforms.filter(s => s.id !== id)
      }));
    },
    addITIntegration: async (name) => {
      const newIntegration = { id: uuidv4(), name, isActive: true };
      await syncToDb({ it_integrations: [newIntegration] });
      set(state => ({ itIntegrations: [...state.itIntegrations, newIntegration] }));
    },
    updateITIntegration: async (id, updates) => {
      const state = get();
      const existing = state.itIntegrations.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ it_integrations: [updated] });
      set(state => ({
        itIntegrations: state.itIntegrations.map(s => s.id === id ? updated : s)
      }));
    },
    deleteITIntegration: async (id) => {
      await apiFetch('/api/delete-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'it_integrations', id })
      }).then(async (res) => {
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Failed to delete');
        }
      });
      set(state => ({
        itIntegrations: state.itIntegrations.filter(s => s.id !== id)
      }));
    },
    addLostReason: async (name) => {
      const newReason = { id: uuidv4(), name, isActive: true };
      await syncToDb({ lost_reasons: [newReason] });
      set(state => ({ lostReasons: [...state.lostReasons, newReason] }));
    },
    updateLostReason: async (id, updates) => {
      const state = get();
      const existing = state.lostReasons.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...updates };
      await syncToDb({ lost_reasons: [updated] });
      set(state => ({
        lostReasons: state.lostReasons.map(s => s.id === id ? updated : s)
      }));
    },
    deleteLostReason: async (id) => {
      await apiFetch('/api/delete-entity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'lost_reasons', id })
      }).then(async (res) => {
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Failed to delete');
        }
      });
      set(state => ({
        lostReasons: state.lostReasons.filter(s => s.id !== id)
      }));
    },

    login: async (email, passwordHash) => {
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, passwordHash })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'invalidCredentials');
        }
        
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('jwt_token', data.token);
          if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        }
        set({ currentUser: data.user });
      } catch (err: any) {
        throw new Error(err.message || 'invalidCredentials');
      }
    },

  logout: () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
    set({ currentUser: null });
  },

  requestPasswordReset: async (email) => {
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data.token;
    } catch (err) {
      console.error('Failed to request password reset', err);
      return undefined;
    }
  },

  resetPassword: async (token, newPasswordHash) => {
    try {
      const res = await apiFetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPasswordHash })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update password');
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      throw err;
    }
  },

  changePassword: async (currentPasswordHash, newPasswordHash) => {
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPasswordHash, newPasswordHash })
      });
      if (res.ok) {
        get().addNotification('Password updated successfully', 'success');
        return { success: true };
      } else {
        const body = await res.json();
        get().addNotification(body.message || body.error || 'Failed to update password', 'error');
        return { success: false, error: body.message || body.error };
      }
    } catch (err: any) {
      console.error('Failed to update password', err);
      get().addNotification('Failed to update password', 'error');
      return { success: false, error: err.message };
    }
  },

  setCurrentUser: (userId) => set((state) => ({ 
    currentUser: state.users.find(u => u.id === userId) || null 
  })),

  addCompanyAndDeal: async (companyData, dealCreatorId, hunterId) => {
    const state = get();
    const existingCompany = state.companies.find(c => c.companyId === companyData.companyId);
    if (existingCompany) {
      throw new Error('icoExists');
    }

    const newCompany: Company = { ...companyData, id: uuidv4(), country: companyData.country || 'Czechia' };
    const newDeal: Deal = {
      id: uuidv4(),
      companyId: newCompany.id,
      stage: 'lead_opportunity',
      createdBy: dealCreatorId,
      hunterId: hunterId !== undefined ? hunterId : null,
      closerId: null,
      farmerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newLog: AuditLog = {
      id: uuidv4(),
      dealId: newDeal.id,
      field: 'stage',
      oldValue: '',
      newValue: 'lead_opportunity',
      changedBy: dealCreatorId,
      timestamp: new Date().toISOString()
    };

    await syncToDb({
      companies: [newCompany],
      deals: [newDeal],
      audit_logs: [newLog]
    });

    set((state) => ({
      companies: [...state.companies, newCompany],
      deals: [...state.deals, newDeal],
      auditLogs: [...state.auditLogs, newLog]
    }));
  },

  updateCompany: async (id, updates, userId) => {
    const state = get();
    const companyIndex = state.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return;

    const oldCompany = state.companies[companyIndex];
    if (updates.companyId && updates.companyId !== oldCompany.companyId) {
      if (state.companies.some(c => c.id !== id && c.companyId === updates.companyId)) {
        throw new Error('icoExists');
      }
    }

    const newCompany = { ...oldCompany, ...updates };
    const newCompanies = [...state.companies];
    newCompanies[companyIndex] = newCompany;

    const newLogs: AuditLog[] = [];
    
    // Generate audit logs for simple fields
    Object.keys(updates).forEach(key => {
      const field = key as keyof Company;
      if (field === 'contacts' || field === 'urls') return; // Handled separately or implicitly
      
      const oldVal = oldCompany[field];
      const newVal = newCompany[field];
      
      if (oldVal !== newVal) {
        newLogs.push({
          id: uuidv4(),
          companyId: id,
          field,
          oldValue: formatAuditValue(state, field, oldVal),
          newValue: formatAuditValue(state, field, newVal),
          changedBy: userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    await syncToDb({
      companies: [newCompany],
      audit_logs: newLogs
    });

    set((state) => ({
      companies: newCompanies,
      auditLogs: [...state.auditLogs, ...newLogs]
    }));
  },

  updateDealStage: async (dealId, newStage, userId) => {
    const state = get();
    const dealIndex = state.deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) return;

    const oldDeal = state.deals[dealIndex];
    if (oldDeal.stage === newStage) return;

    const updatedDeal = { ...oldDeal, stage: newStage, updatedAt: new Date().toISOString() };
    const newDeals = [...state.deals];
    newDeals[dealIndex] = updatedDeal;

    const newLog: AuditLog = {
      id: uuidv4(),
      dealId: dealId,
      field: 'stage',
      oldValue: oldDeal.stage,
      newValue: newStage,
      changedBy: userId,
      timestamp: new Date().toISOString()
    };

    await syncToDb({
      deals: [updatedDeal],
      audit_logs: [newLog]
    });

    set((state) => ({
      deals: newDeals,
      auditLogs: [...state.auditLogs, newLog]
    }));
  },

  updateDeal: async (dealId, updates, userId) => {
    const state = get();
    const dealIndex = state.deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) return;

    const oldDeal = state.deals[dealIndex];
    const newDeal = { ...oldDeal, ...updates, updatedAt: new Date().toISOString() };
    const newDeals = [...state.deals];
    newDeals[dealIndex] = newDeal;

    const newLogs: AuditLog[] = [];
    
    Object.keys(updates).forEach(key => {
      const field = key as keyof Deal;
      const oldVal = oldDeal[field];
      const newVal = newDeal[field];
      
      if (oldVal !== newVal) {
        if (typeof newVal === 'object' || typeof oldVal === 'object') {
          const oldStr = JSON.stringify(oldVal || null);
          const newStr = JSON.stringify(newVal || null);
          if (oldStr !== newStr) {
            newLogs.push({
              id: uuidv4(),
              dealId: dealId,
              field,
              oldValue: oldStr,
              newValue: newStr,
              changedBy: userId,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          newLogs.push({
            id: uuidv4(),
            dealId: dealId,
            field,
            oldValue: formatAuditValue(state, field, oldVal),
            newValue: formatAuditValue(state, field, newVal),
            changedBy: userId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    await syncToDb({
      deals: [newDeal],
      audit_logs: newLogs
    });

    set((state) => ({
      deals: newDeals,
      auditLogs: [...state.auditLogs, ...newLogs]
    }));
  },

  checkPostponedDeals: async () => {
    const state = get();
    const now = new Date();
    let hasChanges = false;
    const newDeals = state.deals.map(deal => {
      if (deal.postponedUntil && !deal.lostPermanently && new Date(deal.postponedUntil) <= now && deal.stage === 'lost') {
        hasChanges = true;
        return {
          ...deal,
          stage: 'lead_opportunity' as Stage, // or 'opportunity', returning to 'lead'
          postponedUntil: undefined,
          postponedReason: undefined,
          postponedBy: undefined,
          postponedAt: undefined,
          updatedAt: now.toISOString()
        };
      }
      return deal;
    });

    if (hasChanges) {
      await syncToDb({ deals: newDeals });
      set({ deals: newDeals });
    }
  },

  addUser: async (user) => {
    const state = get();
    if (state.users.some(u => u.email === user.email)) {
      throw new Error('emailExists');
    }
    const newUser = { ...user, id: uuidv4() };
    await syncToDb({ users: [newUser] });
    set((state) => ({ users: [...state.users, newUser] }));
  },

  updateUser: async (id, userData) => {
    const state = get();
    if (userData.email && state.users.some(u => u.id !== id && u.email === userData.email)) {
      throw new Error('emailExists');
    }
    const updatedUsers = state.users.map(u => u.id === id ? { ...u, ...userData } : u);
    const userToSync = updatedUsers.find(u => u.id === id);
    if (userToSync) await syncToDb({ users: [userToSync] });
    
    // Also update currentUser if we are modifying the currently logged in user
    set({ 
      users: updatedUsers,
      currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...userData } : state.currentUser
    });
  },

  addActivity: async (activity) => {
    const state = get();
    const newActivity = { ...activity, id: uuidv4(), createdAt: new Date().toISOString() };
    await syncToDb({ activities: [newActivity] });
    set((state) => ({ activities: [newActivity, ...state.activities] }));
  },
  
  updateActivity: async (id, activityData) => {
    const state = get();
    const updatedActivities = state.activities.map(a => a.id === id ? { ...a, ...activityData } : a);
    const activityToSync = updatedActivities.find(a => a.id === id);
    if (activityToSync) await syncToDb({ activities: [activityToSync] });
    set({ activities: updatedActivities });
  },

  deleteActivity: async (id) => {
    await apiFetch('/api/delete-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'activities', id })
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
    });
    set(state => ({
      activities: state.activities.filter(a => a.id !== id)
    }));
  },
  
  syncGlobalCalendar: async () => {
    const state = get();
    if (!state.currentUser) return;
    
    let isConnected = false;
    let provider = '';
    let credentials = null;
    
    if (state.currentUser.googleIntegration?.connected) {
      isConnected = true;
      provider = 'google';
      credentials = state.currentUser.googleIntegration;
    } else if (state.currentUser.msIntegration?.connected) {
      isConnected = true;
      provider = 'microsoft';
      credentials = state.currentUser.msIntegration;
    }
    
    if (!isConnected) return;
    
    try {
      const resCal = await apiFetch('/api/sync/fetch-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials })
      });
      
      if (resCal.ok) {
        const dataCal = await resCal.json();
        if (dataCal.events) {
          const externalEvIds = new Set(dataCal.events.map((e: any) => e.id));
          
          // Re-get state specifically for loop
          const currentActivities = get().activities;

          for (const ev of dataCal.events) {
             const existing = currentActivities.find(a => a.type !== 'email' && a.externalEventId === ev.id);
             if (existing && ev.date) {
               if (new Date(existing.date).getTime() !== new Date(ev.date).getTime() || existing.meetingLink !== ev.link || existing.note !== ev.subject) {
                 await get().updateActivity(existing.id, { date: ev.date, meetingLink: ev.link, note: ev.subject });
               }
             }
          }

          // Check for deleted
          const localFutureExternal = currentActivities.filter(a => 
            a.type !== 'email' && 
            a.externalEventId && 
            new Date(a.date || a.createdAt) > new Date()
          );

          for (const lAct of localFutureExternal) {
            if (!externalEvIds.has(lAct.externalEventId)) {
                await get().deleteActivity(lAct.id);
                const i18n = (await import('./i18n')).default;
                get().addNotification(i18n.t('settings.integrations.calendarDeleted', `Událost z kalendáře byla smazána: ${lAct.note}`), 'info');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to global sync calendar', e);
    }
  },

  addNotification: (message, type = 'info') => {
    const id = uuidv4();
    set(state => ({
      notifications: [...state.notifications, { id, message, type }]
    }));
    setTimeout(() => {
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 5000);
  },

  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  }
  };
});
