import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../schemas/user.schema';
import { InvitesService } from '../invites/invites.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private invitesService: InvitesService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
  ) {}

  async sendOtp(phoneNumber: string): Promise<{ message: string }> {
    // In a real app, integrate with SMS provider (Twilio, etc.)
    // For MVP/Dev, we log the OTP
    const otp = '123456';
    console.log(`[AuthService] Sending OTP to ${phoneNumber}: ${otp}`);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    intent?: string,
    inviteCode?: string,
  ): Promise<{ token: string; user: any }> {
    // Hardcoded OTP for MVP
    if (otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP');
    }

    let user = await this.usersService.findByPhone(phoneNumber);

    if (!user) {
      // New User Registration Logic
      if (intent === 'create') {
        // Allow registration for new Group Admins
        user = await this.usersService.create({
          phoneNumber,
          name: 'New Admin',
          role: UserRole.GROUP_ADMIN, // Immediately set as GROUP_ADMIN
        });
      } else if (intent === 'join') {
        // Strict Member Onboarding
        if (!inviteCode) {
          throw new UnauthorizedException('Invite code is required to join.');
        }

        // Validate Invite
        const invite = await this.invitesService.validateInvite(
          phoneNumber,
          inviteCode,
        );

        // Create User
        user = await this.usersService.create({
          phoneNumber,
          name: 'New Member',
          role: UserRole.MEMBER,
          isInvited: true,
        });

        // Auto-join Group
        try {
          await this.groupsService.joinGroup(
            user._id.toString(),
            invite.groupId,
          );
        } catch (error) {
          await this.usersService.delete(user._id.toString());
          throw error;
        }

        // Mark invite as accepted
        await this.invitesService.acceptInvite((invite as any)._id.toString());
      } else {
        throw new UnauthorizedException(
          'You must be invited to join or create a new group.',
        );
      }
    } else {
      // Existing User Logic
      // Prevent existing users from "creating" a new account, but allow login
      // If they are trying to join a new group with an invite code:
      if (intent === 'join' && inviteCode) {
        try {
          const invite = await this.invitesService.validateInvite(
            phoneNumber,
            inviteCode,
          );
          // Check if already in group? joinGroup handles that.
          await this.groupsService.joinGroup(
            user._id.toString(),
            invite.groupId,
          );
          await this.invitesService.acceptInvite(
            (invite as any)._id.toString(),
          );
        } catch (e) {
          // If invite is invalid but user exists, just log them in?
          // Or fail? User said "verify that code".
          // If they provided a code, they expect it to work.
          throw e;
        }
      }
    }

    const payload = {
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        gender: user.gender,
        createdAt: (user as any).createdAt,
      },
    };
  }

  /**
   * Biometric login - allows login without OTP when biometrics are verified on device
   * Note: Biometric verification happens on the client device, this endpoint trusts that
   * verification. For production, consider adding additional security measures like
   * device fingerprinting or rate limiting.
   * 
   * This method uses the same registration/login logic as verifyOtp but skips OTP validation.
   */
  async biometricLogin(
    phoneNumber: string,
    intent?: string,
    inviteCode?: string,
  ): Promise<{ token: string; user: any }> {
    let user = await this.usersService.findByPhone(phoneNumber);

    if (!user) {
      // New User Registration Logic (same as verifyOtp)
      if (intent === 'create') {
        user = await this.usersService.create({
          phoneNumber,
          name: 'New Admin',
          role: UserRole.GROUP_ADMIN, // Immediately set as GROUP_ADMIN
        });
      } else if (intent === 'join') {
        // Strict Member Onboarding
        if (!inviteCode) {
          throw new UnauthorizedException('Invite code is required to join.');
        }

        // Validate Invite
        const invite = await this.invitesService.validateInvite(
          phoneNumber,
          inviteCode,
        );

        // Create User
        user = await this.usersService.create({
          phoneNumber,
          name: 'New Member',
          role: UserRole.MEMBER,
          isInvited: true,
        });

        // Auto-join Group
        try {
          await this.groupsService.joinGroup(
            user._id.toString(),
            invite.groupId,
          );
        } catch (error) {
          await this.usersService.delete(user._id.toString());
          throw error;
        }

        // Mark invite as accepted
        await this.invitesService.acceptInvite((invite as any)._id.toString());
      } else {
        throw new UnauthorizedException(
          'You must be invited to join or create a new group.',
        );
      }
    } else {
      // Existing User Logic (same as verifyOtp)
      if (intent === 'join' && inviteCode) {
        try {
          const invite = await this.invitesService.validateInvite(
            phoneNumber,
            inviteCode,
          );
          await this.groupsService.joinGroup(
            user._id.toString(),
            invite.groupId,
          );
          await this.invitesService.acceptInvite(
            (invite as any)._id.toString(),
          );
        } catch (e) {
          throw e;
        }
      }
    }

    // Generate JWT token (same as verifyOtp)
    const payload = {
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        gender: user.gender,
        createdAt: (user as any).createdAt,
      },
    };
  }
}
