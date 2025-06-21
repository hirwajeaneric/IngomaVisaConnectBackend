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

    static async sendApplicationSubmittedEmail(email: string, applicationNumber: string, visaType: string, officerName?: string): Promise<void> {
        await this.sendMail({
            to: email,
            subject: 'IngomaVisaConnect - Visa Application Submitted Successfully',
            html: `
                <h2>Your Visa Application Has Been Submitted Successfully!</h2>
                <p>Dear Applicant,</p>
                <p>We are pleased to inform you that your visa application has been submitted successfully and is now under review.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Application Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Status:</strong> Under Review</li>
                        ${officerName ? `<li><strong>Assigned Officer:</strong> ${officerName}</li>` : ''}
                        <li><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <p><strong>What happens next?</strong></p>
                <ol>
                    <li>Your application will be reviewed by our immigration officers</li>
                    <li>You may be contacted for additional information or an interview</li>
                    <li>You will receive updates on your application status</li>
                    <li>A decision will be made within the standard processing time</li>
                </ol>
                <p>You can track your application status by logging into your account or contacting our support team.</p>
                <p>If you have any questions or need to provide additional information, please don't hesitate to contact us.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendApplicationStatusChangeEmail(email: string, applicationNumber: string, visaType: string, oldStatus: string, newStatus: string, rejectionReason?: string): Promise<void> {
        const statusMessages = {
            'SUBMITTED': 'Your application has been submitted and is under review.',
            'UNDER_REVIEW': 'Your application is currently being reviewed by our officers.',
            'APPROVED': 'Congratulations! Your visa application has been approved.',
            'REJECTED': 'We regret to inform you that your visa application has been rejected.',
            'INTERVIEW_SCHEDULED': 'An interview has been scheduled for your application.',
            'DOCUMENTS_REQUESTED': 'Additional documents are required for your application.',
            'PENDING_PAYMENT': 'Payment is required to proceed with your application.'
        };

        const statusMessage = statusMessages[newStatus as keyof typeof statusMessages] || 'Your application status has been updated.';

        await this.sendMail({
            to: email,
            subject: `IngomaVisaConnect - Application Status Update: ${newStatus}`,
            html: `
                <h2>Visa Application Status Update</h2>
                <p>Dear Applicant,</p>
                <p>Your visa application status has been updated.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Application Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Previous Status:</strong> ${oldStatus}</li>
                        <li><strong>New Status:</strong> ${newStatus}</li>
                        <li><strong>Update Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <p><strong>Status Message:</strong></p>
                <p>${statusMessage}</p>
                ${rejectionReason ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h4>Rejection Reason:</h4>
                    <p>${rejectionReason}</p>
                </div>
                ` : ''}
                <p>You can view the full details of your application by logging into your account.</p>
                <p>If you have any questions about this status update, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }
}