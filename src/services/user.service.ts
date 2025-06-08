import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Role } from '../generated/prisma';

export class UserService {
  private static readonly VALID_PERMISSIONS = [
    'APPLICATIONS_VIEW_APPLICATIONS',
    'APPLICATIONS_MANAGE_APPLICATIONS',
    'APPLICATIONS_APPROVE_VISAS',
    'APPLICATIONS_REJECT_VISAS',
    'USERS_VIEW_USERS',
    'USERS_MANAGE_USERS',
    'USERS_CREATE_ADMIN',
    'SYSTEM_VIEW_REPORTS',
    'SYSTEM_MANAGE_SYSTEM',
    'SYSTEM_VIEW_LOGS',
    'INTERVIEWS_SCHEDULE_INTERVIEWS',
    'INTERVIEWS_CONDUCT_INTERVIEWS',
    'PAYMENTS_VIEW_PAYMENTS',
    'PAYMENTS_PROCESS_REFUNDS',
  ];

  private static readonly ADMIN_DEFAULT_PERMISSIONS = [
    'USERS_CREATE_ADMIN',
    'SYSTEM_MANAGE_SYSTEM',
    'PAYMENTS_PROCESS_REFUNDS',
    'ADMIN_DEFAULT_PERMISSIONS'
  ];

  private static readonly OFFICER_DEFAULT_PERMISSIONS = [
    'APPLICATIONS_VIEW_APPLICATIONS',
    'APPLICATIONS_MANAGE_APPLICATIONS',
    'INTERVIEWS_SCHEDULE_INTERVIEWS',
    'INTERVIEWS_CONDUCT_INTERVIEWS',
  ];

  async getProfile(email: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.logAuditEvent(email, 'PROFILE_FETCH_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }
    await this.logAuditEvent(email, 'PROFILE_FETCH_SUCCESS', 'User profile fetched');
    return this.mapToUserProfileDto(user);
  }

  async updateProfile(email: string, data: { email?: string; name: string; phone?: string }): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.logAuditEvent(email, 'PROFILE_UPDATE_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }

    // If email is being updated, check if it's already in use
    if (data.email && data.email !== email) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        await this.logAuditEvent(email, 'PROFILE_UPDATE_FAILED', 'Email already in use');
        throw new ConflictError('Email already in use');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
      },
    });

    await this.logAuditEvent(email, 'PROFILE_UPDATE_SUCCESS', 'User profile updated');
    return this.mapToUserProfileDto(updatedUser);
  }

  async getAllUsers(adminEmail: string): Promise<any[]> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'VIEW_USERS_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'VIEW_USERS_FAILED', 'Non-admin attempted to view users');
      throw new ForbiddenError('Only admins can view all users');
    }
    const users = await prisma.user.findMany();
    await this.logAuditEvent(adminEmail, 'VIEW_USERS_SUCCESS', 'Admin viewed all users');
    return users.map(this.mapToUserProfileDto);
  }

  async getUserById(adminEmail: string, userId: string): Promise<any> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'VIEW_USER_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'VIEW_USER_FAILED', 'Non-admin attempted to view user');
      throw new ForbiddenError('Only admins can view user details');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await this.logAuditEvent(adminEmail, 'VIEW_USER_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }
    await this.logAuditEvent(adminEmail, 'VIEW_USER_SUCCESS', `Admin viewed user: ${userId}`);
    return this.mapToUserProfileDto(user);
  }

  async updateUser(adminEmail: string, data: { id: string; name?: string; role?: Role; phone?: string; department?: string; title?: string; permissions?: string[]; isActive?: boolean }): Promise<any> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'UPDATE_USER_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'UPDATE_USER_FAILED', 'Non-admin attempted to update user');
      throw new ForbiddenError('Only admins can update users');
    }
    const user = await prisma.user.findUnique({ where: { id: data.id } });
    if (!user) {
      await this.logAuditEvent(adminEmail, 'UPDATE_USER_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }
    if (data.permissions) {
      this.validatePermissions(data.permissions);
    }
    const updatedUser = await prisma.user.update({
      where: { id: data.id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        department: data.department,
        title: data.title,
        permissions: data.role === Role.ADMIN && data.permissions && !UserService.ADMIN_DEFAULT_PERMISSIONS.every(perm => data.permissions?.includes(perm))
          ? UserService.ADMIN_DEFAULT_PERMISSIONS
          : data.permissions,
        isActive: data.isActive ?? user.isActive,
      },
    });
    await this.logAuditEvent(adminEmail, 'UPDATE_USER_SUCCESS', `Admin updated user: ${data.id}`);
    return this.mapToUserProfileDto(updatedUser);
  }

  async deleteUser(adminEmail: string, userId: string): Promise<void> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'DELETE_USER_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'DELETE_USER_FAILED', 'Non-admin attempted to delete user');
      throw new ForbiddenError('Only admins can delete users');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await this.logAuditEvent(adminEmail, 'DELETE_USER_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }
    if (user.role === Role.ADMIN && user.email === adminEmail) {
      await this.logAuditEvent(adminEmail, 'DELETE_USER_FAILED', 'Admin attempted to delete self');
      throw new BadRequestError('Admins cannot delete themselves');
    }
    await prisma.user.delete({ where: { id: userId } });
    await this.logAuditEvent(adminEmail, 'DELETE_USER_SUCCESS', `Admin deleted user: ${userId}`);
  }

  async createOfficer(adminEmail: string, data: { email: string; password: string; name: string; phone?: string; department?: string; title?: string }): Promise<any> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'CREATE_OFFICER_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'CREATE_OFFICER_FAILED', 'Non-admin attempted to create officer');
      throw new ForbiddenError('Only admins can create officers');
    }
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      await this.logAuditEvent(adminEmail, 'CREATE_OFFICER_FAILED', `Email already exists: ${data.email}`);
      throw new ConflictError('Email already exists');
    }
    this.validatePermissions(UserService.OFFICER_DEFAULT_PERMISSIONS);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const officer = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: Role.OFFICER,
        phone: data.phone,
        department: data.department,
        title: data.title,
        isActive: true,
        createdAt: new Date(),
        twoFactorEnabled: false,
        permissions: UserService.OFFICER_DEFAULT_PERMISSIONS,
      },
    });
    await this.logAuditEvent(adminEmail, 'CREATE_OFFICER_SUCCESS', `Officer created: ${data.email}`);
    return this.mapToUserProfileDto(officer);
  }

  async updateAvatar(email: string, avatarUrl: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.logAuditEvent(email, 'AVATAR_UPDATE_FAILED', 'User not found');
      throw new NotFoundError('User not found');
    }

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch (error) {
      await this.logAuditEvent(email, 'AVATAR_UPDATE_FAILED', 'Invalid avatar URL format');
      throw new BadRequestError('Invalid avatar URL format');
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        avatar: avatarUrl,
      },
    });

    await this.logAuditEvent(email, 'AVATAR_UPDATE_SUCCESS', 'User avatar updated');
    return this.mapToUserProfileDto(updatedUser);
  }

  async updateOfficerPermissions(adminEmail: string, officerId: string, permissions: string[]): Promise<any> {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await this.logAuditEvent(adminEmail, 'UPDATE_PERMISSIONS_FAILED', 'Admin not found');
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== Role.ADMIN) {
      await this.logAuditEvent(adminEmail, 'UPDATE_PERMISSIONS_FAILED', 'Non-admin attempted to update permissions');
      throw new ForbiddenError('Only admins can update officer permissions');
    }

    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer) {
      await this.logAuditEvent(adminEmail, 'UPDATE_PERMISSIONS_FAILED', 'Officer not found');
      throw new NotFoundError('Officer not found');
    }
    if (officer.role !== Role.OFFICER) {
      await this.logAuditEvent(adminEmail, 'UPDATE_PERMISSIONS_FAILED', 'User is not an officer');
      throw new BadRequestError('User is not an officer');
    }

    // Validate permissions
    this.validatePermissions(permissions);

    // Ensure officer permissions don't include admin-only permissions
    const adminOnlyPermissions = UserService.ADMIN_DEFAULT_PERMISSIONS;
    const filteredPermissions = permissions.filter(perm => !adminOnlyPermissions.includes(perm));

    const updatedOfficer = await prisma.user.update({
      where: { id: officerId },
      data: {
        permissions: filteredPermissions,
      },
    });

    await this.logAuditEvent(adminEmail, 'UPDATE_PERMISSIONS_SUCCESS', `Updated permissions for officer: ${officerId}`);
    return this.mapToUserProfileDto(updatedOfficer);
  }

  private validatePermissions(permissions: string[]): void {
    for (const permission of permissions) {
      if (!UserService.VALID_PERMISSIONS.includes(permission)) {
        throw new BadRequestError(`Invalid permission: ${permission}`);
      }
    }
  }

  private mapToUserProfileDto(user: any): any {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      department: user.department,
      title: user.title,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt.toLocaleString(),
      lastActive: user.lastActive?.toLocaleString(),
    };
  }

  private async logAuditEvent(email: string, action: string, details: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        user: { connect: { email } },
        userRole: (await prisma.user.findUnique({ where: { email } }))?.role || 'UNKNOWN',
        action,
        entityType: 'USER',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}