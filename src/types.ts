export type Role = 'hunter' | 'closer' | 'farmer' | 'cso' | 'administrator';

export type Stage = 'opportunity' | 'lead' | 'discovery_proposal' | 'contracting' | 'onboarding' | 'farming' | 'lost';

export type Region = 'SK_CZ' | 'CEE' | 'DACH' | 'EUROPE' | 'WORLD';

export interface Segment {
  id: string;
  name: string;
  isActive?: boolean;
}

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
  isTestAccount?: boolean;
  googleIntegration?: { connected: boolean; tokens?: any } | null;
  msIntegration?: { connected: boolean; tokens?: any } | null;
}

export interface ContactPosition {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  position?: string;
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
  segment?: string;
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
  duration?: number;
  transcript?: string;
  isVisible?: boolean;
  participants?: string[];
  externalEventId?: string;
  recordingLink?: string;
  meetingSummary?: string;
}

export interface LeadSource {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface StorageType {
  id: string;
  name: string;
  isActive: boolean;
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

export interface Note {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
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
  storageTypeId?: string;
  estimatedYearlyParcels?: number;
  seasonMonths?: string[];
  skuCount?: number;
  productsSold?: string;
  codUsage?: { countryCode: string; percentage: number }[];
  b2cShare?: number;
  estimatedMonthlyParcels?: number;
  deliveryCountries?: string[];
  averageItemsPerOrder?: number;
  averageParcelWeight?: number;
  averageParcelVolume?: number;
  pricingOffers?: PricingOffer[];
  documents?: DealDocument[];
  notes?: Note[];
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
  segments: Segment[];
  ecommercePlatforms: EcommercePlatform[];
  storageTypes: StorageType[];
  itIntegrations: ITIntegration[];
  lostReasons: LostReason[];
  contactPositions: ContactPosition[];
  
  kanbanUserFilter: string | null;
  setKanbanUserFilter: (userId: string | null) => void;
  kanbanCompanySearch: string;
  setKanbanCompanySearch: (term: string) => void;
  kanbanCountryFilter: string[];
  setKanbanCountryFilter: (countries: string[]) => void;
  kanbanSegmentFilter: string[];
  setKanbanSegmentFilter: (segments: string[]) => void;
  resetKanbanFilters: () => void;

  // Actions
  refreshState: () => Promise<void>;
  updateSegment: (id: string, updates: Partial<Segment>) => Promise<void>;
  addSegment: (name: string) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;
  updateLeadSource: (id: string, updates: Partial<LeadSource>) => Promise<void>;
  addLeadSource: (name: string) => Promise<void>;
  deleteLeadSource: (id: string) => Promise<void>;
  updateEcommercePlatform: (id: string, updates: Partial<EcommercePlatform>) => Promise<void>;
  addEcommercePlatform: (name: string) => Promise<void>;
  updateStorageType: (id: string, updates: Partial<StorageType>) => Promise<void>;
  addStorageType: (name: string) => Promise<void>;
  deleteStorageType: (id: string) => Promise<void>;
  deleteEcommercePlatform: (id: string) => Promise<void>;
  updateITIntegration: (id: string, updates: Partial<ITIntegration>) => Promise<void>;
  addITIntegration: (name: string) => Promise<void>;
  deleteITIntegration: (id: string) => Promise<void>;
  updateLostReason: (id: string, updates: Partial<LostReason>) => Promise<void>;
  addLostReason: (name: string) => Promise<void>;
  deleteLostReason: (id: string) => Promise<void>;
  updateContactPosition: (id: string, updates: Partial<ContactPosition>) => Promise<void>;
  addContactPosition: (name: string) => Promise<void>;
  deleteContactPosition: (id: string) => Promise<void>;
  fetchDealDetails: (dealId: string) => Promise<void>;
  login: (email: string, passwordHash: string) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<string | undefined>; // returns token for dev purposes
  resetPassword: (token: string, newPasswordHash: string) => void;
  changePassword: (currentPasswordHash: string, newPasswordHash: string) => Promise<{ success: boolean; error?: string }>;
  
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
