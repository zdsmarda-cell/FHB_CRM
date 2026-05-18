import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { StoreState, User, Company, Deal, AuditLog, Stage } from './types';

// Simple mockup hash function to simulate "encrypted in DB"
export const hashPassword = (password: string) => btoa(encodeURIComponent(password + '_secret_salt'));

const DEFAULT_PASS = hashPassword('password123');

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('jwt_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  options.headers = headers;
  const res = await fetch(url, options);
  if (res.status === 401 && url !== '/api/auth/login') {
    localStorage.removeItem('jwt_token');
    useStore.setState({ currentUser: null });
  }
  return res;
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
    auditLogs: [],
    activities: [],
    currentUser: null,

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
        }
        set({ currentUser: data.user });
      } catch (err: any) {
        throw new Error(err.message || 'invalidCredentials');
      }
    },

  logout: () => {
    localStorage.removeItem('jwt_token');
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
          oldValue: String(oldVal),
          newValue: String(newVal),
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
            oldValue: String(oldVal),
            newValue: String(newVal),
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
    set({ users: updatedUsers });
  },

  addActivity: async (activity) => {
    const state = get();
    const newActivity = { ...activity, id: uuidv4(), createdAt: new Date().toISOString() };
    await syncToDb({ activities: [newActivity] });
    set((state) => ({ activities: [newActivity, ...state.activities] }));
  }
  };
});
