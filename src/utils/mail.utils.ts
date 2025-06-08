import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export class MailUtil {
    static async sendMail(options: MailOptions): Promise<void> {
        await transporter.sendMail({
            from: process.env.MAIL_USERNAME,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    }

    static async sendOtp(email: string, otp: string): Promise<void> {
        await this.sendMail({
            to: email,
            subject: 'IngomaVisaConnect - OTP Verification',
            html: `Your OTP for account verification is: <b>${otp}</b><br>Valid for 10 minutes.`,
        });
    }

    static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        await this.sendMail({
            to: email,
            subject: 'IngomaVisaConnect - Password Reset',
            html: `Click the link to reset your password: <a href="http://localhost:3000/api/auth/password-reset/confirm?token=${token}">Reset Password</a><br>Valid for 1 hour.`,
        });
    }
}