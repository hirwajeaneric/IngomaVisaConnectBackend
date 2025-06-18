import bcrypt from 'bcryptjs';
import { JwtUtil } from '../utils/jwt.utils';
import { Role } from '../generated/prisma';
import { MailUtil } from '../utils/mail.utils';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { prisma } from '../lib/prisma';

export class AuthService {
    private static readonly ADMIN_DEFAULT_PERMISSIONS = [
        'USERS_CREATE_ADMIN',
        'SYSTEM_MANAGE_SYSTEM',
        'PAYMENTS_PROCESS_REFUNDS',
    ];

    private static readonly OFFICER_DEFAULT_PERMISSIONS = [
        'APPLICATIONS_VIEW_APPLICATIONS',
        'APPLICATIONS_MANAGE_APPLICATIONS',
        'INTERVIEWS_SCHEDULE_INTERVIEWS',
        'INTERVIEWS_CONDUCT_INTERVIEWS',
    ];

    async login(email: string, password: string): Promise<{ token: string; refreshToken: string; user: any }> {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new NotFoundError('User not found');
            }
            if (!user.isActive) {
                await this.logAuditEvent(email, 'LOGIN_FAILED', 'Account not activated');
                throw new BadRequestError('Account not activated. Please verify your email.');
            }
            if (!(await bcrypt.compare(password, user.password))) {
                await this.logAuditEvent(email, 'LOGIN_FAILED', 'Invalid credentials');
                throw new UnauthorizedError('Invalid email or password');
            }
            const token = JwtUtil.generateToken(user.email, user.id, user.role, user.permissions);
            const refreshToken = JwtUtil.generateRefreshToken(user.email);
            await this.logAuditEvent(email, 'LOGIN_SUCCESS', 'User logged in successfully');
            return { token, refreshToken, user: { email: user.email, name: user.name, role: user.role, permissions: user.permissions, avatar: user.avatar, department: user.department } };
        } catch (error) {
            if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
                throw error;
            }
            console.log(error);
            throw new BadRequestError('Login failed');
        }
    }

    async signup(data: {
        email: string;
        password: string;
        name: string;
        role?: Role;
        phone?: string;
        department?: string;
        title?: string;
    }): Promise<void> {
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            await this.logAuditEvent(data.email, 'SIGNUP_FAILED', 'Email already exists');
            throw new ConflictError('Email already exists');
        }
        if (data.role === Role.OFFICER) {
            await this.logAuditEvent(data.email, 'SIGNUP_FAILED', 'Officer accounts restricted');
            throw new BadRequestError('Officer accounts can only be created by admins');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: data.role || Role.APPLICANT,
                phone: data.phone,
                department: data.department,
                title: data.title,
                isActive: false,
                createdAt: new Date(),
                twoFactorEnabled: false,
                permissions: data.role === Role.ADMIN ? AuthService.ADMIN_DEFAULT_PERMISSIONS : [],
            },
        });
        await this.sendOtp(user.email);
        await this.logAuditEvent(user.email, 'SIGNUP_SUCCESS', 'User signed up successfully');
    }

    async verifyOtp(email: string, otp: string): Promise<void> {
        const otpRecord = await prisma.oTP.findFirst({
            where: { email, otp, used: false },
        });
        if (!otpRecord) {
            await this.logAuditEvent(email, 'OTP_VERIFY_FAILED', 'Invalid or expired OTP');
            throw new BadRequestError('Invalid or expired OTP');
        }
        if (otpRecord.expiresAt < new Date()) {
            await this.logAuditEvent(email, 'OTP_VERIFY_FAILED', 'OTP expired');
            throw new BadRequestError('OTP has expired');
        }
        await prisma.user.update({
            where: { email },
            data: { isActive: true },
        });
        await prisma.oTP.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });
        await this.logAuditEvent(email, 'OTP_VERIFY_SUCCESS', 'OTP verified successfully');
    }

    async resendOtp(email: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await this.logAuditEvent(email, 'OTP_RESEND_FAILED', 'User not found');
            throw new NotFoundError('User not found');
        }
        if (user.isActive) {
            await this.logAuditEvent(email, 'OTP_RESEND_FAILED', 'Account already activated');
            throw new BadRequestError('Account already activated');
        }
        await this.sendOtp(email);
        await this.logAuditEvent(email, 'OTP_RESEND_SUCCESS', 'OTP resent successfully');
    }

    async requestPasswordReset(email: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await this.logAuditEvent(email, 'PASSWORD_RESET_REQUEST_FAILED', 'User not found');
            throw new NotFoundError('User not found');
        }
        const token = Math.random().toString(36).substring(2);
        await prisma.user.update({
            where: { email },
            data: {
                passwordResetToken: token,
                passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
            },
        });
        await MailUtil.sendPasswordResetEmail(email, token);
        await this.logAuditEvent(email, 'PASSWORD_RESET_REQUEST_SUCCESS', 'Password reset requested');
    }

    async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
        const user = await prisma.user.findFirst({
            where: { passwordResetToken: token },
        });
        if (!user) {
            await this.logAuditEvent('unknown', 'PASSWORD_RESET_CONFIRM_FAILED', 'Invalid or expired reset token');
            throw new BadRequestError('Invalid or expired reset token');
        }
        if (user.passwordResetExpires! < new Date()) {
            await this.logAuditEvent(user.email, 'PASSWORD_RESET_CONFIRM_FAILED', 'Reset token expired');
            throw new BadRequestError('Reset token has expired');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: user.email },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
        await this.logAuditEvent(user.email, 'PASSWORD_RESET_CONFIRM_SUCCESS', 'Password reset successfully');
    }

    async changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await this.logAuditEvent(email, 'PASSWORD_CHANGE_FAILED', 'User not found');
            throw new NotFoundError('User not found');
        }
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            await this.logAuditEvent(email, 'PASSWORD_CHANGE_FAILED', 'Current password incorrect');
            throw new UnauthorizedError('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        await this.logAuditEvent(email, 'PASSWORD_CHANGE_SUCCESS', 'Password changed successfully');
    }

    private async sendOtp(email: string): Promise<void> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.oTP.create({
            data: {
                email,
                otp,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                used: false,
            },
        });
        await MailUtil.sendOtp(email, otp);
    }

    private async logAuditEvent(email: string, action: string, details: string): Promise<void> {
        await prisma.auditLog.create({
            data: {
                user: { connect: { email } },
                userRole: (await prisma.user.findUnique({ where: { email } }))?.role || 'UNKNOWN',
                action,
                entityType: 'AUTH',
                details: { detail: details },
                createdAt: new Date(),
            },
        });
    }

    private async sendOfficerCredentials(email: string, password: string): Promise<void> {
        await MailUtil.sendMail({
            to: email,
            subject: 'Your IngomaVisaConnect Officer Account Credentials',
            html: `
                <h2>Welcome to IngomaVisaConnect!</h2>
                <p>Your officer account has been created. Here are your login credentials:</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${password}</p>
                <p><strong>Important:</strong> For security reasons, you will be prompted to change your password upon first login.</p>
                <p>Please login at: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
                <p>If you have any questions, please contact the system administrator.</p>
            `,
        });
    }

    async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
        try {
            const payload = JwtUtil.verifyToken(refreshToken);
            const user = await prisma.user.findUnique({ where: { email: payload.email } });
            
            if (!user || !user.isActive) {
                throw new UnauthorizedError('Invalid refresh token');
            }

            // Generate new tokens
            const newToken = JwtUtil.generateToken(user.email, user.id, user.role, user.permissions);
            const newRefreshToken = JwtUtil.generateRefreshToken(user.email);

            await this.logAuditEvent(user.email, 'TOKEN_REFRESH', 'Token refreshed successfully');
            
            return { token: newToken, refreshToken: newRefreshToken };
        } catch (error) {
            await this.logAuditEvent('unknown', 'TOKEN_REFRESH_FAILED', 'Invalid refresh token');
            throw new UnauthorizedError('Invalid refresh token');
        }
    }
}