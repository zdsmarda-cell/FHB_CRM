import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { StoreState, User, Company, Deal, AuditLog, Stage } from './types';

// Simple mockup hash function to simulate "encrypted in DB"
export const hashPassword = (password: string) => btoa(encodeURIComponent(password + '_secret_salt'));

const DEFAULT_PASS = hashPassword('password123');

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin Adam', email: 'admin@fhb.com', role: 'administrator', managerId: null, isActive: true, passwordHash: DEFAULT_PASS },
  { id: '2', name: 'CSO Charles', email: 'cso@fhb.com', role: 'cso', managerId: null, isActive: true, passwordHash: DEFAULT_PASS },
  { id: '3', name: 'Hunter Helen', email: 'hunter1@fhb.com', role: 'hunter', managerId: '2', isActive: true, passwordHash: DEFAULT_PASS },
  { id: '4', name: 'Closer Chris', email: 'closer1@fhb.com', role: 'closer', managerId: '2', isActive: true, passwordHash: DEFAULT_PASS },
  { id: '5', name: 'Farmer Fred', email: 'farmer1@fhb.com', role: 'farmer', managerId: '2', isActive: true, passwordHash: DEFAULT_PASS },
  { id: '6', name: 'Hunter Hank', email: 'hunter2@fhb.com', role: 'hunter', managerId: '3', isActive: false, passwordHash: DEFAULT_PASS }, // Inactive example
];

const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    companyId: '12345678',
    name: 'Tech Corp',
    address: 'Prague 1',
    region: 'SK_CZ',
    segment: 'software',
    email: 'info@techcorp.cz',
    phone: '+420123456789',
    urls: ['https://techcorp.cz'],
    contacts: [{ id: 'ct1', name: 'Jan Novak', position: 'CEO', email: 'jan@techcorp.cz', phone: '' }]
  }
];

const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    companyId: 'c1',
    stage: 'lead_opportunity',
    createdBy: '3',
    ownerId: '3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const useStore = create<StoreState>((set, get) => {
  // Try loading initial state from DB after a small delay
  setTimeout(async () => {
    try {
      const res = await fetch('/api/state');
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
      console.error('Failed to load initial state from DB', err);
    }
  }, 100);

  // Helper function to sync with DB
  const syncToDb = async (entities: Record<string, any[]>) => {
    try {
      await fetch('/api/sync-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities })
      });
    } catch (err) {
      console.error('Failed to sync to DB', err);
    }
  };

  return {
    users: [],
    companies: [],
    deals: [],
    auditLogs: [],
    activities: [],
    currentUser: null,

    login: (email, passwordHash) => {
      const user = get().users.find(u => u.email === email && u.passwordHash === passwordHash);
      if (!user) {
        throw new Error('invalidCredentials');
      }
      if (!user.isActive) {
        throw new Error('inactiveAccount');
      }
      set({ currentUser: user });
    },

  logout: () => set({ currentUser: null }),

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

  addCompanyAndDeal: (companyData, dealCreatorId) => set((state) => {
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

    syncToDb({
      companies: [newCompany],
      deals: [newDeal],
      audit_logs: [newLog]
    });

    return {
      companies: [...state.companies, newCompany],
      deals: [...state.deals, newDeal],
      auditLogs: [...state.auditLogs, newLog]
    };
  }),

  updateCompany: (id, updates, userId) => set((state) => {
    const companyIndex = state.companies.findIndex(c => c.id === id);
    if (companyIndex === -1) return state;

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

    syncToDb({
      companies: [newCompany],
      audit_logs: newLogs
    });

    return {
      companies: newCompanies,
      auditLogs: [...state.auditLogs, ...newLogs]
    };
  }),

  updateDealStage: (dealId, newStage, userId) => set((state) => {
    const dealIndex = state.deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) return state;

    const oldDeal = state.deals[dealIndex];
    if (oldDeal.stage === newStage) return state;

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

    syncToDb({
      deals: [updatedDeal],
      audit_logs: [newLog]
    });

    return {
      deals: newDeals,
      auditLogs: [...state.auditLogs, newLog]
    };
  }),

  updateDeal: (dealId, updates, userId) => set((state) => {
    const dealIndex = state.deals.findIndex(d => d.id === dealId);
    if (dealIndex === -1) return state;

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

    syncToDb({
      deals: [newDeal],
      audit_logs: newLogs
    });

    return {
      deals: newDeals,
      auditLogs: [...state.auditLogs, ...newLogs]
    };
  }),

  checkPostponedDeals: () => set((state) => {
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
      syncToDb({ deals: newDeals });
      return { deals: newDeals };
    }
    return state;
  }),

  addUser: (user) => set((state) => {
    if (state.users.some(u => u.email === user.email)) {
      throw new Error('emailExists');
    }
    const newUser = { ...user, id: uuidv4() };
    syncToDb({ users: [newUser] });
    return { users: [...state.users, newUser] };
  }),

  updateUser: (id, userData) => set((state) => {
    if (userData.email && state.users.some(u => u.id !== id && u.email === userData.email)) {
      throw new Error('emailExists');
    }
    const updatedUsers = state.users.map(u => u.id === id ? { ...u, ...userData } : u);
    const userToSync = updatedUsers.find(u => u.id === id);
    if (userToSync) syncToDb({ users: [userToSync] });
    return { users: updatedUsers };
  }),

  addActivity: (activity) => set((state) => {
    const newActivity = { ...activity, id: uuidv4(), createdAt: new Date().toISOString() };
    syncToDb({ activities: [newActivity] });
    return { activities: [newActivity, ...state.activities] };
  })
  };
});
