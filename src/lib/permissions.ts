import { User, Deal, Stage, StoreState } from '../types';

export const STAGES: Stage[] = [
  'opportunity',
  'lead',
  'discovery_proposal',
  'contracting',
  'onboarding',
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
    case 'hunter': return stage === 'opportunity' || stage === 'lead';
    case 'closer': return stage === 'discovery_proposal' || stage === 'contracting' || stage === 'onboarding';
    case 'farmer': return stage === 'farming';
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
    if (visibleUserIds.includes(deal.hunterId!) || 
        visibleUserIds.includes(deal.closerId!) || 
        visibleUserIds.includes(deal.farmerId!)) {
      return true;
    }

    // Unassigned rule: user can see deals in their allowed stages if there is no assignee for that stage
    if (canViewStage(user, deal.stage)) {
      if ((deal.stage === 'opportunity' || deal.stage === 'lead') && !deal.hunterId) return true;
      if ((deal.stage === 'discovery_proposal' || deal.stage === 'contracting' || deal.stage === 'onboarding') && !deal.closerId) return true;
      if (deal.stage === 'farming' && !deal.farmerId) return true;
      if (deal.stage === 'lost') {
        let field = 'hunterId';
        const originalStage = deal.lostFromStage;

        if (originalStage === 'farming') field = 'farmerId';
        else if (originalStage === 'discovery_proposal' || originalStage === 'contracting' || originalStage === 'onboarding') field = 'closerId';
        else if (originalStage === 'opportunity' || originalStage === 'lead') field = 'hunterId';
        else if (deal.farmerId !== null) field = 'farmerId';
        else if (deal.closerId !== null) field = 'closerId';

        if (user.role === 'hunter' && field === 'hunterId' && !deal.hunterId) return true;
        if (user.role === 'closer' && field === 'closerId' && !deal.closerId) return true;
        if (user.role === 'farmer' && field === 'farmerId' && !deal.farmerId) return true;
      }
    }

    return false;
  }).filter(deal => {
    // Plus stage visibility rule
    // A manager can see deals of their subordinate even in stages the manager wouldn't normally see?
    // "s jejich příležitosti totožné akce" -> can do identical actions. 
    // Yes, if it's subordinate's deal, they can see it and act on it.
    if (subIds.includes(deal.hunterId!) || subIds.includes(deal.closerId!) || subIds.includes(deal.farmerId!)) return true;
    
    // For their own deals, they only see their allowed stages
    return canViewStage(user, deal.stage) || deal.stage === 'lost';
  });
}
