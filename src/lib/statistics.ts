import { User, Deal, Company, StoreState } from '../types';
import { getSubordinateIds } from './permissions';

/**
 * Checks if a deal is a test opportunity.
 * Test opportunities are excluded from all statistics calculations.
 */
export function isTestDeal(deal: Deal, state: { users: User[]; companies: Company[] }): boolean {
  if (!deal) return false;
  if ((deal as any).isTest) return true;

  // Check creator
  const creator = state.users.find(u => u.id === deal.createdBy);
  if (creator?.isTestAccount) return true;

  // Check assigned hunter/closer/farmer
  const hunter = state.users.find(u => u.id === deal.hunterId);
  if (hunter?.isTestAccount) return true;

  const closer = state.users.find(u => u.id === deal.closerId);
  if (closer?.isTestAccount) return true;

  const farmer = state.users.find(u => u.id === deal.farmerId);
  if (farmer?.isTestAccount) return true;

  // Check company name / IČ for test markers
  const company = state.companies.find(c => c.id === deal.companyId);
  if (company) {
    if ((company as any).isTest) return true;
    const name = (company.name || '').toLowerCase();
    if (
      name.startsWith('test') ||
      name.includes('[test]') ||
      name.includes('(test)') ||
      name.includes('testovací') ||
      name.includes('testovaci')
    ) {
      return true;
    }
    const ico = (company.companyId || '').toLowerCase();
    if (ico.includes('test')) return true;
  }

  return false;
}

/**
 * Evaluates statistics access scope based on current user role and management hierarchy:
 * - Admin and CSO: see statistics for all users, can filter across any user.
 * - Manager / Vedoucí (has subordinates): can see and filter ONLY between themselves and subordinates.
 * - All other users: see only their own data (cannot filter across others).
 */
export function getUserStatisticsScope(currentUser: User | null, allUsers: User[]) {
  if (!currentUser) {
    return {
      isAll: false,
      isManager: false,
      isRegular: true,
      allowedUserIds: [] as string[],
      accessibleUsers: [] as User[]
    };
  }

  if (currentUser.role === 'administrator' || currentUser.role === 'cso') {
    return {
      isAll: true,
      isManager: false,
      isRegular: false,
      allowedUserIds: allUsers.map(u => u.id),
      accessibleUsers: allUsers.filter(u => !u.isTestAccount)
    };
  }

  const subordinateIds = getSubordinateIds(allUsers, currentUser.id);
  if (subordinateIds.length > 0) {
    const allowedUserIds = [currentUser.id, ...subordinateIds];
    return {
      isAll: false,
      isManager: true,
      isRegular: false,
      allowedUserIds,
      accessibleUsers: allUsers.filter(u => allowedUserIds.includes(u.id) && !u.isTestAccount)
    };
  }

  // Regular individual user
  return {
    isAll: false,
    isManager: false,
    isRegular: true,
    allowedUserIds: [currentUser.id],
    accessibleUsers: [currentUser]
  };
}

/**
 * Format milliseconds into human-readable Czech days and hours (e.g., "3 dny, 14 hodin")
 */
export function formatDaysAndHours(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '0 hodin';
  const totalHours = ms / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);

  const dayStr = days === 1 ? '1 den' : (days >= 2 && days <= 4 ? `${days} dny` : `${days} dní`);
  const hourStr = hours === 1 ? '1 hodina' : (hours >= 2 && hours <= 4 ? `${hours} hodiny` : `${hours} hodin`);

  if (days === 0) {
    return hours === 0 ? '< 1 hodina' : hourStr;
  }
  if (hours === 0) {
    return dayStr;
  }
  return `${dayStr}, ${hourStr}`;
}
