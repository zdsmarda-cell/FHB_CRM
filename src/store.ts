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
          users: data.users || [],
          companies: data.companies || [],
          deals: data.deals || [],
          auditLogs: data.auditLogs || [],
          activities: data.activities || []
        });
      } else {
        throw new Error('Failed to fetch from DB');
      }
    } catch (err) {
      console.warn('DB state not available', err);
      // Empty state if DB fails
      set({
        users: [],
        companies: [],
        deals: [],
        auditLogs: [],
        activities: [],
      });
    }
  }, 100);

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
          set({
            users: data.users || [],
            companies: data.companies || [],
            deals: data.deals || [],
            auditLogs: data.auditLogs || [],
            activities: data.activities || []
          });
        }
      } catch (err) {
        console.warn('DB state not available', err);
      }
    },
    users: [],
    companies: [],
    deals: [],
    auditLogs: [],
    activities: [],
    currentUser: null,

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

  requestPasswordReset: (email) => {
    const userId = get().users.find(u => u.email === email)?.id;
    if (!userId) {
      // Simulate silent failure for security
      return ''; 
    }
    const token = uuidv4();
    // Set 10 min expiry
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    set(state => {
      const updatedUsers = state.users.map(u => u.id === userId ? { ...u, resetToken: token, resetTokenExpiry: expiry } : u);
      const userToSync = updatedUsers.find(u => u.id === userId);
      if (userToSync) syncToDb({ users: [userToSync] });
      return { users: updatedUsers };
    });
    
    return token;
  },

  resetPassword: (token, newPasswordHash) => {
    set(state => {
      const user = state.users.find(u => u.resetToken === token);
      if (!user || !user.resetTokenExpiry) throw new Error('Invalid or expired token');
      
      const isExpired = new Date(user.resetTokenExpiry).getTime() < Date.now();
      if (isExpired) throw new Error('Token has expired');
      
      const updatedUsers = state.users.map(u => u.id === user.id ? { 
        ...u, 
        passwordHash: newPasswordHash, 
        resetToken: undefined, 
        resetTokenExpiry: undefined 
      } : u);

      const userToSync = updatedUsers.find(u => u.id === user.id);
      if (userToSync) syncToDb({ users: [userToSync] });

      return { users: updatedUsers };
    });
  },

  setCurrentUser: (userId) => set((state) => ({ 
    currentUser: state.users.find(u => u.id === userId) || null 
  })),

  addCompanyAndDeal: async (companyData, dealCreatorId) => {
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
      ownerId: dealCreatorId,
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
      
      if (oldVal !== newVal && typeof newVal !== 'object') {
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
          stage: 'lead' as Stage, // or 'opportunity', returning to 'lead'
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
