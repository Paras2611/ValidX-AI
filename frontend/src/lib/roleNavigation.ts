import { UserRole } from '../types';

/**
 * Returns the default workspace / dashboard route for a given user role.
 */
export function getAssignedRoute(role?: UserRole | string | null): string {
  switch (role) {
    case 'applicant':
      return '/applicant';
    case 'officer':
      return '/officer/queue';
    case 'compliance':
      return '/compliance';
    case 'admin':
    case 'auditor':
      return '/admin';
    default:
      return '/applicant';
  }
}
