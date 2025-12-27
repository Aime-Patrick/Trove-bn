import { GroupMember } from '../../schemas/group-member.schema';

/**
 * Extract user ID from a GroupMember object
 * Handles both populated and non-populated userId fields
 */
export function extractUserId(member: GroupMember): string {
  if (typeof member.userId === 'string') {
    return member.userId;
  }
  if (member.userId && typeof member.userId === 'object') {
    const userObj = member.userId as unknown as {
      _id?: { toString: () => string };
      id?: string;
    };
    return userObj._id?.toString() || userObj.id || '';
  }
  return '';
}

/**
 * Extract user name from a populated GroupMember
 */
export function extractUserName(member: GroupMember): string {
  if (typeof member.userId === 'object' && member.userId) {
    const userObj = member.userId as unknown as { name?: string };
    return userObj.name || 'Member';
  }
  return 'Member';
}
