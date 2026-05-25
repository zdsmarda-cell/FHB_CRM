export type Role = 'hunter' | 'closer' | 'farmer' | 'cso' | 'administrator';

export type Stage = 'lead_opportunity' | 'discovery_proposal' | 'contracting' | 'onboarding' | 'farming' | 'lost';

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
  googleIntegration?: { connected: boolean; tokens?: any } | null;
  msIntegration?: { connected: boolean; tokens?: any } | null;
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
  isVisible?: boolean;
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
  isVisible?: boolean;
  participants?: string[];
  externalEventId?: string;
}

export interface LeadSource {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface EcommercePlatform {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface ITIntegration {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface LostReason {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface PricingOffer {
  id: string;
  filename: string;
  url?: string;
  dateSent: string;
  createdBy: string;
}

export interface DealDocument {
  id: string;
  description: string;
  filename: string;
  url?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Deal {
  id: string;
  companyId: string;
  stage: Stage;
  createdBy: string;
  hunterId: string | null;
  closerId: string | null;
  farmerId: string | null;
  leadSourceId?: string;
  ecommercePlatformId?: string;
  estimatedMonthlyParcels?: number;
  deliveryCountries?: string[];
  averageItemsPerOrder?: number;
  averageParcelWeight?: number;
  averageParcelVolume?: number;
  pricingOffers?: PricingOffer[];
  documents?: DealDocument[];
  contractSignedDate?: string | null;
  pricingUploadedDate?: string | null;
  itIntegrationId?: string | null;
  firstStockingDate?: string | null; // Expected first stocking date
  itIntegrationCompletedDate?: string | null; // IT integrace dokončena a otestována
  firstStockingDateActual?: string | null; // První naskladnění
  integrationTestingCompletedDate?: string | null; // Odladění integrace na testovacích objednávkách
  createdAt: string;
  updatedAt: string;
  postponedUntil?: string;
  postponedReason?: string;
  postponedBy?: string;
  postponedAt?: string;
  lostPermanently?: boolean;
  lostReason?: string;
  lostReasonId?: string;
  lostBy?: string;
  lostAt?: string;
  lostFromStage?: Stage;
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

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface StoreState {
  isInitialized: boolean;
  users: User[];
  companies: Company[];
  deals: Deal[];
  auditLogs: AuditLog[];
  activities: Activity[];
  currentUser: User | null;
  notifications: Notification[];
  leadSources: LeadSource[];
  ecommercePlatforms: EcommercePlatform[];
  itIntegrations: ITIntegration[];
  lostReasons: LostReason[];
  
  kanbanUserFilter: string | null;
  setKanbanUserFilter: (userId: string | null) => void;

  // Actions
  refreshState: () => Promise<void>;
  updateLeadSource: (id: string, updates: Partial<LeadSource>) => Promise<void>;
  addLeadSource: (name: string) => Promise<void>;
  deleteLeadSource: (id: string) => Promise<void>;
  updateEcommercePlatform: (id: string, updates: Partial<EcommercePlatform>) => Promise<void>;
  addEcommercePlatform: (name: string) => Promise<void>;
  deleteEcommercePlatform: (id: string) => Promise<void>;
  updateITIntegration: (id: string, updates: Partial<ITIntegration>) => Promise<void>;
  addITIntegration: (name: string) => Promise<void>;
  deleteITIntegration: (id: string) => Promise<void>;
  updateLostReason: (id: string, updates: Partial<LostReason>) => Promise<void>;
  addLostReason: (name: string) => Promise<void>;
  deleteLostReason: (id: string) => Promise<void>;
  fetchDealDetails: (dealId: string) => Promise<void>;
  login: (email: string, passwordHash: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<string | undefined>; // returns token for dev purposes
  resetPassword: (token: string, newPasswordHash: string) => void;
  
  setCurrentUser: (userId: string) => void; // Keeping for compatibility, though login is preferred
  addCompanyAndDeal: (company: Omit<Company, 'id'>, dealCreatorId: string, hunterId?: string | null) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>, userId: string) => Promise<void>;
  updateDealStage: (dealId: string, newStage: Stage, userId: string) => Promise<void>;
  updateDeal: (dealId: string, updates: Partial<Deal>, userId: string) => Promise<void>;
  checkPostponedDeals: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
  updateActivity: (id: string, activity: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  syncGlobalCalendar: () => Promise<void>;
  addNotification: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeNotification: (id: string) => void;
}
