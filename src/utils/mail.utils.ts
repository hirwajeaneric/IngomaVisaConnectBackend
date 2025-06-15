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

    static async sendApplicationCreatedEmail(email: string, applicationNumber: string, visaType: string, amount: number): Promise<void> {
        await this.sendMail({
            to: email,
            subject: 'IngomaVisaConnect - Visa Application Created',
            html: `
                <h2>Your Visa Application Has Been Created Successfully!</h2>
                <p>Dear Applicant,</p>
                <p>Your visa application has been created successfully with the following details:</p>
                <ul>
                    <li><strong>Application Number:</strong> ${applicationNumber}</li>
                    <li><strong>Visa Type:</strong> ${visaType}</li>
                    <li><strong>Amount Due:</strong> $${amount}</li>
                </ul>
                <p>To proceed with your application, please complete the payment process by clicking the link below:</p>
                <p><a href="${process.env.FRONTEND_URL}/applications/${applicationNumber}/payment">Proceed to Payment</a></p>
                <p>Please note that your application will not be processed until the payment is completed.</p>
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }
}