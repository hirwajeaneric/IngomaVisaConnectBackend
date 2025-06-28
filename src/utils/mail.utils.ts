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

    static async sendDocumentRequestCreatedEmail(
        applicantEmail: string, 
        applicationNumber: string, 
        documentName: string, 
        additionalDetails?: string,
        officerName?: string
    ): Promise<void> {
        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Additional Document Requested',
            html: `
                <h2>Additional Document Requested</h2>
                <p>Dear Applicant,</p>
                <p>Our immigration officer has requested an additional document for your visa application.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Request Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Document Required:</strong> ${documentName}</li>
                        ${officerName ? `<li><strong>Requested By:</strong> ${officerName}</li>` : ''}
                        <li><strong>Request Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                ${additionalDetails ? `
                <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <h4>Additional Information:</h4>
                    <p>${additionalDetails}</p>
                </div>
                ` : ''}
                <p><strong>What you need to do:</strong></p>
                <ol>
                    <li>Log into your account</li>
                    <li>Navigate to your application</li>
                    <li>Upload the requested document</li>
                    <li>Submit the document for review</li>
                </ol>
                <p>Please ensure that the document is clear, legible, and meets the requirements specified above.</p>
                <p>Your application processing will continue once the requested document is received and verified.</p>
                <p>If you have any questions about this request or need assistance, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendDocumentRequestCancelledEmail(
        applicantEmail: string, 
        applicationNumber: string, 
        documentName: string,
        officerName?: string
    ): Promise<void> {
        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Document Request Cancelled',
            html: `
                <h2>Document Request Cancelled</h2>
                <p>Dear Applicant,</p>
                <p>The request for an additional document has been cancelled by our immigration officer.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Cancelled Request Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Document:</strong> ${documentName}</li>
                        ${officerName ? `<li><strong>Cancelled By:</strong> ${officerName}</li>` : ''}
                        <li><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <p>You no longer need to provide this document. Your application will continue to be processed with the documents already submitted.</p>
                <p>If you have any questions about this cancellation, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendDocumentSubmittedForRequestEmail(
        officerEmail: string,
        applicantName: string,
        applicationNumber: string,
        documentName: string,
        fileName: string
    ): Promise<void> {
        await this.sendMail({
            to: officerEmail,
            subject: 'IngomaVisaConnect - Document Submitted for Review',
            html: `
                <h2>Document Submitted for Review</h2>
                <p>Dear Officer,</p>
                <p>A document has been submitted in response to your request.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Submission Details:</h3>
                    <ul>
                        <li><strong>Applicant Name:</strong> ${applicantName}</li>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Requested Document:</strong> ${documentName}</li>
                        <li><strong>Submitted File:</strong> ${fileName}</li>
                        <li><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <p>Please review the submitted document and update the application status accordingly.</p>
                <p>You can access the application through the admin dashboard to review the document.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendInterviewScheduledEmail(
        applicantEmail: string,
        applicationNumber: string,
        visaType: string,
        scheduledDate: string,
        location: string,
        officerName: string,
        notes?: string
    ): Promise<void> {
        const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Visa Interview Scheduled',
            html: `
                <h2>Visa Interview Scheduled</h2>
                <p>Dear Applicant,</p>
                <p>Your visa interview has been scheduled successfully.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Interview Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Date & Time:</strong> ${formattedDate}</li>
                        <li><strong>Location:</strong> ${location}</li>
                        <li><strong>Interview Officer:</strong> ${officerName}</li>
                    </ul>
                </div>
                ${notes ? `
                <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <h4>Additional Information:</h4>
                    <p>${notes}</p>
                </div>
                ` : ''}
                <p><strong>What you need to do:</strong></p>
                <ol>
                    <li>Log into your account to confirm the interview</li>
                    <li>Prepare all required documents</li>
                    <li>Arrive at the location 15 minutes before the scheduled time</li>
                    <li>Bring your passport and application documents</li>
                </ol>
                <p><strong>Interview Preparation Tips:</strong></p>
                <ul>
                    <li>Have your passport and application documents ready</li>
                    <li>Dress formally as you would for an important meeting</li>
                    <li>Be prepared to answer questions about your travel plans</li>
                    <li>Bring any additional documents that might be relevant</li>
                </ul>
                <p>Please confirm your attendance by logging into your account and clicking the confirmation button.</p>
                <p>If you have any questions or need to reschedule, please contact our support team immediately.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendInterviewRescheduledEmail(
        applicantEmail: string,
        applicationNumber: string,
        visaType: string,
        oldScheduledDate: string,
        newScheduledDate: string,
        oldLocation: string,
        newLocation: string,
        officerName: string
    ): Promise<void> {
        const oldFormattedDate = new Date(oldScheduledDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        const newFormattedDate = new Date(newScheduledDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Interview Rescheduled',
            html: `
                <h2>Interview Rescheduled</h2>
                <p>Dear Applicant,</p>
                <p>Your visa interview has been rescheduled by our immigration officer.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Previous Interview Details:</h3>
                    <ul>
                        <li><strong>Date & Time:</strong> ${oldFormattedDate}</li>
                        <li><strong>Location:</strong> ${oldLocation}</li>
                    </ul>
                </div>
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3>New Interview Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Date & Time:</strong> ${newFormattedDate}</li>
                        <li><strong>Location:</strong> ${newLocation}</li>
                        <li><strong>Interview Officer:</strong> ${officerName}</li>
                    </ul>
                </div>
                <p>Please update your calendar and confirm your attendance for the new date and time.</p>
                <p>If you have any questions about the rescheduling, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendInterviewCancelledEmail(
        applicantEmail: string,
        applicationNumber: string,
        visaType: string,
        scheduledDate: string,
        location: string,
        officerName: string
    ): Promise<void> {
        const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Interview Cancelled',
            html: `
                <h2>Interview Cancelled</h2>
                <p>Dear Applicant,</p>
                <p>Your visa interview has been cancelled by our immigration officer.</p>
                <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <h3>Cancelled Interview Details:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Date & Time:</strong> ${formattedDate}</li>
                        <li><strong>Location:</strong> ${location}</li>
                        <li><strong>Cancelled By:</strong> ${officerName}</li>
                    </ul>
                </div>
                <p>A new interview will be scheduled and you will be notified accordingly.</p>
                <p>Your application processing will continue, and you will receive updates on any new interview arrangements.</p>
                <p>If you have any questions about the cancellation, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendInterviewConfirmedEmail(
        officerEmail: string,
        applicantName: string,
        applicationNumber: string,
        visaType: string,
        scheduledDate: string,
        location: string
    ): Promise<void> {
        const formattedDate = new Date(scheduledDate).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        await this.sendMail({
            to: officerEmail,
            subject: 'IngomaVisaConnect - Interview Confirmed by Applicant',
            html: `
                <h2>Interview Confirmed</h2>
                <p>Dear Officer,</p>
                <p>The applicant has confirmed their attendance for the scheduled interview.</p>
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <h3>Confirmed Interview Details:</h3>
                    <ul>
                        <li><strong>Applicant Name:</strong> ${applicantName}</li>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Date & Time:</strong> ${formattedDate}</li>
                        <li><strong>Location:</strong> ${location}</li>
                        <li><strong>Confirmation Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <p>The applicant is expected to attend the interview at the scheduled time and location.</p>
                <p>Please ensure you have all necessary documents and information ready for the interview.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }

    static async sendInterviewCompletedEmail(
        applicantEmail: string,
        applicationNumber: string,
        visaType: string,
        outcome: string,
        officerName: string
    ): Promise<void> {
        await this.sendMail({
            to: applicantEmail,
            subject: 'IngomaVisaConnect - Interview Completed',
            html: `
                <h2>Interview Completed</h2>
                <p>Dear Applicant,</p>
                <p>Your visa interview has been completed successfully.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Interview Summary:</h3>
                    <ul>
                        <li><strong>Application Number:</strong> ${applicationNumber}</li>
                        <li><strong>Visa Type:</strong> ${visaType}</li>
                        <li><strong>Interview Officer:</strong> ${officerName}</li>
                        <li><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                </div>
                <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                    <h4>Interview Outcome:</h4>
                    <p>${outcome}</p>
                </div>
                <p>Your application will continue to be processed based on the interview outcome.</p>
                <p>You will receive further updates on your application status as the processing continues.</p>
                <p>If you have any questions about the interview or your application, please contact our support team.</p>
                <p>Best regards,<br>IngomaVisaConnect Team</p>
            `,
        });
    }
}