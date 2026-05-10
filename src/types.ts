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
  googleIntegration?: { clientId: string; clientSecret: string; connected: boolean; tokens?: any };
  msIntegration?: { clientId: string; clientSecret: string; connected: boolean; tokens?: any };
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
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
  ownerId: string;
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
  users: User[];
  companies: Company[];
  deals: Deal[];
  auditLogs: AuditLog[];
  activities: Activity[];
  currentUser: User | null;
  
  // Actions
  login: (email: string, passwordHash: string) => void;
  logout: () => void;
  requestPasswordReset: (email: string) => string; // returns token for dev purposes
  resetPassword: (token: string, newPasswordHash: string) => void;
  
  setCurrentUser: (userId: string) => void; // Keeping for compatibility, though login is preferred
  addCompanyAndDeal: (company: Omit<Company, 'id'>, dealCreatorId: string) => void;
  updateCompany: (id: string, updates: Partial<Company>, userId: string) => void;
  updateDealStage: (dealId: string, newStage: Stage, userId: string) => void;
  updateDeal: (dealId: string, updates: Partial<Deal>, userId: string) => void;
  checkPostponedDeals: () => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
}
