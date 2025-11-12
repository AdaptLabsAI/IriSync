import { JobApplication, JobListing } from '@/lib/careers/models';
import { sendEmail } from '@/lib/core/notifications/email';

interface EmailContext {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  posterName?: string;
  applicationId: string;
  jobId: string;
}

/**
 * Send application confirmation email to applicant
 */
export async function sendApplicationConfirmation(
  application: JobApplication,
  job: JobListing
): Promise<boolean> {
  try {
    const emailContext: EmailContext = {
      applicantName: `${application.firstName} ${application.lastName}`,
      jobTitle: job.title,
      companyName: process.env.COMPANY_NAME || 'Our Company',
      applicationId: application.id,
      jobId: job.id
    };

    const subject = `Application Received: ${job.title}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Application Received!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${emailContext.applicantName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Thank you for your interest in the <strong>${emailContext.jobTitle}</strong> position at ${emailContext.companyName}. 
            We've successfully received your application and it's currently being reviewed by our team.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">What happens next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li>Our hiring team will review your application</li>
              <li>If we feel you're a good fit, we'll reach out within 1-2 weeks</li>
              <li>You'll receive updates via email about your application status</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Application ID:</strong> ${emailContext.applicationId}
          </p>
          
          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            Best regards,<br>
            The ${emailContext.companyName} Hiring Team
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          This email was sent automatically. Please do not reply to this email.
        </div>
      </div>
    `;

    await sendEmail({
      to: application.email,
      subject,
      html: htmlBody
    });

    return true;
  } catch (error) {
    console.error('Failed to send application confirmation email:', error);
    return false;
  }
}

/**
 * Send new application notification to job poster
 */
export async function sendNewApplicationNotification(
  application: JobApplication,
  job: JobListing,
  posterEmail: string,
  posterName?: string
): Promise<boolean> {
  try {
    const emailContext: EmailContext = {
      applicantName: `${application.firstName} ${application.lastName}`,
      jobTitle: job.title,
      companyName: process.env.COMPANY_NAME || 'Our Company',
      posterName,
      applicationId: application.id,
      jobId: job.id
    };

    const subject = `New Application: ${emailContext.applicantName} for ${job.title}`;
    
    const applicationUrl = `${process.env.NEXTAUTH_URL}/careers/applications/${application.id}`;
    
    // Convert date safely
    const applicationDate = application.createdAt instanceof Date 
      ? application.createdAt 
      : (application.createdAt as any)?.toDate?.() || new Date();
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">New Application Received</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            ${posterName ? `Hi ${posterName},` : 'Hello,'}
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            You've received a new application for the <strong>${emailContext.jobTitle}</strong> position.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Applicant Details:</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Name:</td>
                <td style="padding: 5px 0; color: #333;">${emailContext.applicantName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Email:</td>
                <td style="padding: 5px 0; color: #333;">${application.email}</td>
              </tr>
              ${application.phone ? `
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Phone:</td>
                <td style="padding: 5px 0; color: #333;">${application.phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Applied:</td>
                <td style="padding: 5px 0; color: #333;">${applicationDate.toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${applicationUrl}" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Review Application
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Application ID:</strong> ${emailContext.applicationId}
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          This email was sent automatically from your careers portal.
        </div>
      </div>
    `;

    await sendEmail({
      to: posterEmail,
      subject,
      html: htmlBody
    });

    return true;
  } catch (error) {
    console.error('Failed to send new application notification:', error);
    return false;
  }
}

/**
 * Send rejection email to applicant
 */
export async function sendRejectionEmail(
  application: JobApplication,
  job: JobListing,
  reason?: string
): Promise<boolean> {
  try {
    const emailContext: EmailContext = {
      applicantName: `${application.firstName} ${application.lastName}`,
      jobTitle: job.title,
      companyName: process.env.COMPANY_NAME || 'Our Company',
      applicationId: application.id,
      jobId: job.id
    };

    const subject = `Update on your application: ${job.title}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Application Update</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${emailContext.applicantName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Thank you for your interest in the <strong>${emailContext.jobTitle}</strong> position at ${emailContext.companyName}. 
            We appreciate the time you invested in applying and learning about our company.
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            After careful consideration, we have decided to move forward with other candidates whose 
            experience more closely matches our current needs for this specific role.
          </p>
          
          ${reason ? `
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-style: italic;">${reason}</p>
          </div>
          ` : ''}
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1976d2;">We encourage you to stay connected!</h3>
            <p style="margin: 0; color: #333; line-height: 1.6;">
              We were impressed by your background and encourage you to apply for future openings 
              that may be a better fit for your skills and experience. Please keep an eye on our 
              careers page for new opportunities.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            We wish you the best of luck in your job search and thank you again for considering ${emailContext.companyName}.
          </p>
          
          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            Best regards,<br>
            The ${emailContext.companyName} Hiring Team
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          This email was sent automatically. Please do not reply to this email.
        </div>
      </div>
    `;

    await sendEmail({
      to: application.email,
      subject,
      html: htmlBody
    });

    return true;
  } catch (error) {
    console.error('Failed to send rejection email:', error);
    return false;
  }
}

/**
 * Send interview request email to applicant
 */
export async function sendInterviewRequestEmail(
  application: JobApplication,
  job: JobListing,
  interviewDetails: {
    message?: string;
    calendarLink?: string;
    interviewerName?: string;
    interviewType?: 'phone' | 'video' | 'in-person';
    duration?: string;
  }
): Promise<boolean> {
  try {
    const emailContext: EmailContext = {
      applicantName: `${application.firstName} ${application.lastName}`,
      jobTitle: job.title,
      companyName: process.env.COMPANY_NAME || 'Our Company',
      applicationId: application.id,
      jobId: job.id
    };

    const subject = `Interview Invitation: ${job.title} at ${emailContext.companyName}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Interview Invitation!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${emailContext.applicantName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            Great news! We were impressed with your application for the <strong>${emailContext.jobTitle}</strong> 
            position and would like to invite you for an interview.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Interview Details:</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Position:</td>
                <td style="padding: 5px 0; color: #333;">${emailContext.jobTitle}</td>
              </tr>
              ${interviewDetails.interviewType ? `
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Interview Type:</td>
                <td style="padding: 5px 0; color: #333;">${interviewDetails.interviewType.charAt(0).toUpperCase() + interviewDetails.interviewType.slice(1)}</td>
              </tr>
              ` : ''}
              ${interviewDetails.duration ? `
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Duration:</td>
                <td style="padding: 5px 0; color: #333;">${interviewDetails.duration}</td>
              </tr>
              ` : ''}
              ${interviewDetails.interviewerName ? `
              <tr>
                <td style="padding: 5px 0; color: #666; font-weight: bold;">Interviewer:</td>
                <td style="padding: 5px 0; color: #333;">${interviewDetails.interviewerName}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${interviewDetails.message ? `
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2;">Additional Information:</h4>
            <p style="margin: 0; color: #333; line-height: 1.6;">${interviewDetails.message}</p>
          </div>
          ` : ''}
          
          ${interviewDetails.calendarLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewDetails.calendarLink}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📅 Schedule Your Interview
            </a>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">
            Click the button above to view available time slots and schedule your interview.
          </p>
          ` : `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404; line-height: 1.6;">
              <strong>Next Steps:</strong> Our team will contact you shortly to schedule the interview 
              at a mutually convenient time.
            </p>
          </div>
          `}
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #333;">What to expect:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
              <li>Discussion about your background and experience</li>
              <li>Details about the role and team</li>
              <li>Opportunity to ask questions about the company</li>
              <li>Information about next steps in the process</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            We look forward to speaking with you and learning more about how you can contribute to our team!
          </p>
          
          <p style="font-size: 16px; color: #333; margin-top: 20px;">
            Best regards,<br>
            The ${emailContext.companyName} Hiring Team
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          If you have any questions, please don't hesitate to reach out to us.
        </div>
      </div>
    `;

    await sendEmail({
      to: application.email,
      subject,
      html: htmlBody
    });

    return true;
  } catch (error) {
    console.error('Failed to send interview request email:', error);
    return false;
  }
} 