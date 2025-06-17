import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. Email functionality will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("Email not sent - SENDGRID_API_KEY not configured:", params.subject);
    return false;
  }

  // Validate email parameters
  if (!params.to || !params.from || !params.subject) {
    console.error("Invalid email parameters:", { to: !!params.to, from: !!params.from, subject: !!params.subject });
    return false;
  }

  console.log(`Attempting to send email via SendGrid:`, {
    to: params.to,
    from: params.from,
    subject: params.subject,
    hasText: !!params.text,
    hasHtml: !!params.html
  });

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'PlotTwist Email Service',
        'List-Unsubscribe': '<mailto:unsubscribe@plottwist.com>',
        'Reply-To': 'support@plottwist.com'
      },
      categories: ['transactional', 'plottwist'],
      customArgs: {
        'email_type': params.subject.includes('Verify') ? 'verification' : 
                     params.subject.includes('Reset') ? 'password_reset' : 
                     params.subject.includes('Welcome') ? 'welcome' : 'notification'
      }
    });
    console.log(`Email sent successfully to ${params.to}: ${params.subject}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
  const subject = "Welcome to PlotTwist!";
  const text = `Hello ${userName},

Welcome to PlotTwist! We're excited to have you join our collaborative storytelling community.

With PlotTwist, you can:
- Create new stories with custom word and character limits
- Invite friends to collaborate on stories
- Take turns building narratives together
- Complete stories and order printed copies

Ready to start your first story? Log in to your account and click "Create New Story" to begin!

Happy writing,
The PlotTwist Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; text-align: center;">Welcome to PlotTwist!</h2>
      
      <p>Hello ${userName},</p>
      
      <p>Welcome to <strong>PlotTwist</strong>! We're excited to have you join our collaborative storytelling community.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">With PlotTwist, you can:</h3>
        <ul style="color: #374151;">
          <li>Create new stories with custom word and character limits</li>
          <li>Invite friends to collaborate on stories</li>
          <li>Take turns building narratives together</li>
          <li>Complete stories and order printed copies</li>
        </ul>
      </div>
      
      <p>Ready to start your first story? Log in to your account and click <strong>"Create New Story"</strong> to begin!</p>
      
      <p style="margin-top: 30px;">Happy writing,<br>
      <strong>The PlotTwist Team</strong></p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: 'officialpumpkininspector@gmail.com',
    subject,
    text,
    html
  });
}

export async function sendStoryInvitationEmail(
  recipientEmail: string, 
  recipientName: string, 
  inviterName: string, 
  storyTitle: string, 
  storyDescription: string
): Promise<boolean> {
  const subject = `${inviterName} invited you to collaborate on "${storyTitle}"`;
  
  const text = `Hello ${recipientName},

${inviterName} has invited you to collaborate on a story called "${storyTitle}" on PlotTwist!

Story Description: ${storyDescription}

PlotTwist is a collaborative storytelling platform where you and your friends can take turns writing parts of a story together. Each contributor adds their own creative touch while building on what others have written.

To accept this invitation and start writing:
1. Log in to your PlotTwist account
2. Check your notifications for pending invitations
3. Accept the invitation to join the story

If you don't have a PlotTwist account yet, you can sign up for free and then accept the invitation.

Happy collaborative writing!
The PlotTwist Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; text-align: center;">Story Collaboration Invitation</h2>
      
      <p>Hello ${recipientName},</p>
      
      <p><strong>${inviterName}</strong> has invited you to collaborate on a story called <strong>"${storyTitle}"</strong> on PlotTwist!</p>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Story: ${storyTitle}</h3>
        <p style="color: #374151; margin-bottom: 0;">${storyDescription}</p>
      </div>
      
      <p>PlotTwist is a collaborative storytelling platform where you and your friends can take turns writing parts of a story together. Each contributor adds their own creative touch while building on what others have written.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">To accept this invitation and start writing:</h3>
        <ol style="color: #374151;">
          <li>Log in to your PlotTwist account</li>
          <li>Check your notifications for pending invitations</li>
          <li>Accept the invitation to join the story</li>
        </ol>
      </div>
      
      <p>If you don't have a PlotTwist account yet, you can sign up for free and then accept the invitation.</p>
      
      <p style="margin-top: 30px;">Happy collaborative writing!<br>
      <strong>The PlotTwist Team</strong></p>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    from: 'officialpumpkininspector@gmail.com',
    subject,
    text,
    html
  });
}

export async function sendEmailVerification(userEmail: string, userName: string, verificationToken: string, baseUrl: string): Promise<boolean> {
  console.log(`Attempting to send verification email to: ${userEmail}`);
  console.log(`Base URL being used: ${baseUrl}`);
  const subject = "Verify Your PlotTwist Account";
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  console.log(`Generated verification URL: ${verificationUrl}`);
  
  const text = `Hello ${userName},

Welcome to PlotTwist! Please verify your email address to complete your account setup.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours for security purposes.

If you didn't create an account with PlotTwist, you can safely ignore this email.

Best regards,
The PlotTwist Team

---
This email was sent from PlotTwist, a collaborative storytelling platform.
You received this because an account was created with this email address.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px; margin: 0;">PlotTwist</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Collaborative Storytelling Platform</p>
      </div>
      
      <h2 style="color: #1f2937; text-align: center; margin-bottom: 30px;">Verify Your Account</h2>
      
      <p style="color: #374151; line-height: 1.5;">Hello ${userName},</p>
      
      <p style="color: #374151; line-height: 1.5;">Welcome to <strong>PlotTwist</strong>! Please verify your email address to complete your account setup and start creating collaborative stories.</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Verify Email Address
        </a>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Can't click the button? Copy and paste this link:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0;">${verificationUrl}</p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px;">
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4;">
          <strong>Important:</strong> This verification link will expire in 24 hours for security purposes.
        </p>
        
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4; margin-top: 20px;">
          If you didn't create an account with PlotTwist, you can safely ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #374151; margin: 0;">Best regards,<br><strong>The PlotTwist Team</strong></p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          This email was sent from PlotTwist, a collaborative storytelling platform.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: 'PlotTwist <officialpumpkininspector@gmail.com>',
    subject,
    text,
    html
  });
}

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string, baseUrl: string): Promise<boolean> {
  console.log(`Attempting to send password reset email to: ${userEmail}`);
  const subject = "Reset Your PlotTwist Password";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  console.log(`Generated password reset URL: ${resetUrl}`);
  
  const text = `Hello ${userName},

You requested to reset your password for your PlotTwist account. If you didn't make this request, you can safely ignore this email.

To reset your password, click the link below:
${resetUrl}

This link will expire in 1 hour for security purposes.

If you have any questions, please contact our support team.

Best regards,
The PlotTwist Team

---
This email was sent from PlotTwist, a collaborative storytelling platform.
If you did not request this password reset, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 24px; margin: 0;">PlotTwist</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Collaborative Storytelling Platform</p>
      </div>
      
      <h2 style="color: #1f2937; text-align: center; margin-bottom: 30px;">Reset Your Password</h2>
      
      <p style="color: #374151; line-height: 1.5;">Hello ${userName},</p>
      
      <p style="color: #374151; line-height: 1.5;">You requested to reset your password for your PlotTwist account. If you didn't make this request, you can safely ignore this email.</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Reset Your Password
        </a>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Can't click the button? Copy and paste this link:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0;">${resetUrl}</p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px;">
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4;">
          <strong>Security Notice:</strong> This link will expire in 1 hour for security purposes. If you have any questions, please contact our support team.
        </p>
        
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4; margin-top: 20px;">
          If you did not request this password reset, please ignore this email. Your account remains secure.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #374151; margin: 0;">Best regards,<br><strong>The PlotTwist Team</strong></p>
        <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
          This email was sent from PlotTwist, a collaborative storytelling platform.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: 'PlotTwist <officialpumpkininspector@gmail.com>',
    subject,
    text,
    html
  });
}