import { User, Deal, Stage, StoreState } from '../types';

export const STAGES: Stage[] = [
  'lead_opportunity',
  'discovery_proposal',
  'contracting',
  'farming',
  'lost'
];

export function getSubordinateIds(users: User[], managerId: string): string[] {
  const subs = users.filter(u => u.managerId === managerId).map(u => u.id);
  let allSubs = [...subs];
  for (const sub of subs) {
    allSubs = [...allSubs, ...getSubordinateIds(users, sub)];
  }
  return allSubs;
}

export function canViewStage(user: User | null, stage: Stage): boolean {
  if (!user) return false;
  if (user.role === 'administrator' || user.role === 'cso') return true;
  if (stage === 'lost') return true; // lost is visible contextually but usually if you can see the deal
  
  switch (user.role) {
    case 'hunter': return stage === 'lead_opportunity';
    case 'closer': return stage === 'discovery_proposal';
    case 'farmer': return stage === 'contracting' || stage === 'farming';
    default: return false;
  }
}

export function getDealsForUser(state: StoreState, user: User | null): Deal[] {
  if (!user) return [];
  if (user.role === 'administrator' || user.role === 'cso') return state.deals;

  const subIds = getSubordinateIds(state.users, user.id);
  const visibleUserIds = [user.id, ...subIds];

  return state.deals.filter(deal => {
    // Basic rule: user owns it or subordinate owns it
    return visibleUserIds.includes(deal.ownerId);
  }).filter(deal => {
    // Plus stage visibility rule
    // A manager can see deals of their subordinate even in stages the manager wouldn't normally see?
    // "s jejich příležitosti totožné akce" -> can do identical actions. 
    // Yes, if it's subordinate's deal, they can see it and act on it.
    if (subIds.includes(deal.ownerId)) return true;
    
    // For their own deals, they only see their allowed stages
    return canViewStage(user, deal.stage) || deal.stage === 'lost';
  });
}
