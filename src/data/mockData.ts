export type ContactStatus = 'lead' | 'active' | 'inactive';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ContactStatus;
  lastContacted: string;
  avatarUrl?: string;
}

export type DealStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: DealStage;
  closeDate: string;
  contactId: string;
}

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  description: string;
  date: string;
  contactId: string;
}

const companies = ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises'];

export const mockContacts: Contact[] = [
  { id: '1', name: 'Alice Smith', email: 'alice@acme.com', phone: '555-0101', company: 'Acme Corp', status: 'lead', lastContacted: '2023-10-25T10:00:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Bob Jones', email: 'bob@globex.com', phone: '555-0102', company: 'Globex', status: 'active', lastContacted: '2023-11-01T14:30:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@soylent.com', phone: '555-0103', company: 'Soylent Corp', status: 'lead', lastContacted: '2023-11-10T09:15:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'Diana Prince', email: 'diana@them.com', phone: '555-0104', company: 'Wayne Enterprises', status: 'active', lastContacted: '2023-11-12T16:45:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Evan Davis', email: 'evan@initech.com', phone: '555-0105', company: 'Initech', status: 'inactive', lastContacted: '2023-09-15T11:20:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
  { id: '6', name: 'Fiona Gallagher', email: 'fiona@umbrella.com', phone: '555-0106', company: 'Umbrella Corp', status: 'lead', lastContacted: '2023-11-15T13:00:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
  { id: '7', name: 'George Costanza', email: 'george@vandelay.com', phone: '555-0107', company: 'Vandelay Industries', status: 'active', lastContacted: '2023-11-14T10:00:00Z', avatarUrl: 'https://i.pravatar.cc/150?u=7' },
];

export const mockDeals: Deal[] = [
  { id: 'd1', title: 'Q4 Enterprise Software License', company: 'Acme Corp', amount: 45000, stage: 'proposal', closeDate: '2023-12-15', contactId: '1' },
  { id: 'd2', title: 'Consulting Retainer', company: 'Globex', amount: 12000, stage: 'negotiation', closeDate: '2023-11-30', contactId: '2' },
  { id: 'd3', title: 'Basic Subscription', company: 'Soylent Corp', amount: 1500, stage: 'qualification', closeDate: '2023-12-01', contactId: '3' },
  { id: 'd4', title: 'Security Upgrade', company: 'Wayne Enterprises', amount: 150000, stage: 'closed_won', closeDate: '2023-10-31', contactId: '4' },
  { id: 'd5', title: 'Cloud Migration', company: 'Umbrella Corp', amount: 85000, stage: 'prospecting', closeDate: '2024-01-15', contactId: '6' },
  { id: 'd6', title: 'Latex Sales', company: 'Vandelay Industries', amount: 5000, stage: 'closed_lost', closeDate: '2023-11-10', contactId: '7' },
];

export const mockActivities: Activity[] = [
  { id: 'a1', type: 'call', description: 'Intro call with Alice to discuss Q4 needs.', date: '2023-10-25T10:00:00Z', contactId: '1' },
  { id: 'a2', type: 'email', description: 'Sent proposal to Bob.', date: '2023-11-01T14:30:00Z', contactId: '2' },
  { id: 'a3', type: 'meeting', description: 'Product demo with Charlie.', date: '2023-11-10T09:15:00Z', contactId: '3' },
  { id: 'a4', type: 'note', description: 'Diana requested a revised quote with a security add-on.', date: '2023-11-12T16:45:00Z', contactId: '4' },
  { id: 'a5', type: 'email', description: 'Followed up with Fiona after cloud webinar.', date: '2023-11-15T13:00:00Z', contactId: '6' },
  { id: 'a6', type: 'call', description: 'Discussed latex inventory strategies.', date: '2023-11-14T10:00:00Z', contactId: '7' },
];

// Helper to generate chart data
export const generateRevenueData = () => {
  return [
    { name: 'Jul', revenue: 4000, deals: 24 },
    { name: 'Aug', revenue: 3000, deals: 13 },
    { name: 'Sep', revenue: 2000, deals: 98 },
    { name: 'Oct', revenue: 2780, deals: 39 },
    { name: 'Nov', revenue: 1890, deals: 48 },
    { name: 'Dec', revenue: 2390, deals: 38 },
  ];
};
