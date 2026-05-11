export type Role = 'hunter' | 'closer' | 'farmer' | 'cso' | 'administrator';

export type Stage = 'lead_opportunity' | 'discovery_proposal' | 'contracting' | 'farming' | 'lost';

export type Region = 'SK_CZ' | 'CEE' | 'DACH' | 'EUROPE' | 'WORLD';

export type Segment = 'fashion' | 'electronics' | 'toys' | 'software' | 'services' | 'other'; // Based on GS1 categorization

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null; // ID of the team lead
  isActive: boolean;
  passwordHash: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  googleIntegration?: { connected: boolean; tokens?: any };
  msIntegration?: { connected: boolean; tokens?: any };
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  phonePrefix?: string;
  photoUrl?: string;
  photoWebpUrl?: string;
  isActive?: boolean;
  doNotContact?: boolean;
  doNotContactReason?: string;
  doNotContactTimestamp?: string;
  doNotContactBy?: string;
}

export interface Company {
  id: string; // Internal UUID
  companyId: string; // IČO
  name: string;
  address: string;
  country?: string;
  region: Region;
  segment: Segment;
  email: string;
  phone: string;
  phonePrefix?: string;
  urls: string[]; // List of URLs
  contacts: Contact[];
}

export type ActivityType = 'meeting' | 'call' | 'teams' | 'email';

export interface Activity {
  id: string;
  dealId: string;
  type: ActivityType;
  date: string;
  note: string;
  createdBy: string;
  createdAt: string;
  meetingLink?: string;
  transcript?: string;
}

export interface Deal {
  id: string;
  companyId: string;
  stage: Stage;
  createdBy: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  postponedUntil?: string;
  postponedReason?: string;
  postponedBy?: string;
  postponedAt?: string;
  lostPermanently?: boolean;
  lostReason?: string;
  lostBy?: string;
  lostAt?: string;
}

export interface AuditLog {
  id: string;
  dealId?: string;
  companyId?: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string; // User ID
  timestamp: string;
}

export interface StoreState {
  isInitialized: boolean;
  users: User[];
  companies: Company[];
  deals: Deal[];
  auditLogs: AuditLog[];
  activities: Activity[];
  currentUser: User | null;
  
  // Actions
  refreshState: () => Promise<void>;
  fetchDealDetails: (dealId: string) => Promise<void>;
  login: (email: string, passwordHash: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<string | undefined>; // returns token for dev purposes
  resetPassword: (token: string, newPasswordHash: string) => void;
  
  setCurrentUser: (userId: string) => void; // Keeping for compatibility, though login is preferred
  addCompanyAndDeal: (company: Omit<Company, 'id'>, dealCreatorId: string, ownerId?: string | null) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>, userId: string) => Promise<void>;
  updateDealStage: (dealId: string, newStage: Stage, userId: string) => Promise<void>;
  updateDeal: (dealId: string, updates: Partial<Deal>, userId: string) => Promise<void>;
  checkPostponedDeals: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
}
