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
      replyTo: 'support@plottwist.com',
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'PlotTwist Email Service',
        'List-Unsubscribe': '<mailto:unsubscribe@plottwist.com>',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36)}@plottwist.com>`,
        'X-Auto-Response-Suppress': 'All',
        'Precedence': 'bulk',
        'X-Entity-Ref-ID': Math.random().toString(36)
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
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error?.response?.body?.errors) {
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
    from: process.env.SENDGRID_VERIFIED_SENDER!,
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
  storyDescription: string,
  storyId?: number,
  baseUrl?: string
): Promise<boolean> {
  const subject = `${inviterName} invited you to collaborate on "${storyTitle}"`;
  
  // Generate story link if storyId and baseUrl are provided
  const storyLink = storyId && baseUrl ? `${baseUrl}/story/${storyId}` : null;
  
  const text = `Hello ${recipientName},

${inviterName} has invited you to collaborate on a story called "${storyTitle}" on PlotTwist!

Story Description: ${storyDescription}

${storyLink ? `View the story: ${storyLink}` : ''}

PlotTwist is a collaborative storytelling platform where you and your friends can take turns writing parts of a story together. Each contributor adds their own creative touch while building on what others have written.

To accept this invitation and start writing:
1. Log in to your PlotTwist account${storyLink ? ` or visit the story link above` : ''}
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
      
      ${storyLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${storyLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          View Story
        </a>
      </div>
      ` : ''}
      
      <p>PlotTwist is a collaborative storytelling platform where you and your friends can take turns writing parts of a story together. Each contributor adds their own creative touch while building on what others have written.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">To accept this invitation and start writing:</h3>
        <ol style="color: #374151;">
          <li>Log in to your PlotTwist account${storyLink ? ` or click the "View Story" button above` : ''}</li>
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
    from: process.env.SENDGRID_VERIFIED_SENDER!,
    subject,
    text,
    html
  });
}

export async function sendEmailVerification(userEmail: string, userName: string, verificationToken: string, baseUrl: string): Promise<boolean> {
  console.log(`Attempting to send verification email to: ${userEmail}`);
  console.log(`Base URL being used: ${baseUrl}`);
  const subject = "Please Verify Your PlotTwist Account";
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
    from: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@plottwist.com',
    subject,
    text,
    html
  });
}

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string, baseUrl: string): Promise<boolean> {
  console.log(`Attempting to send password reset email to: ${userEmail}`);
  const subject = "Your PlotTwist Password Reset Request";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  console.log(`Generated password reset URL: ${resetUrl}`);
  
  const text = `Hello ${userName},

We received a request to reset the password for your PlotTwist account (${userEmail}).

To create a new password, please visit:
${resetUrl}

Important security information:
• This link expires in 1 hour
• Only use this link if you requested the password reset
• If you didn't request this, please ignore this email

Need help? Contact our support team at support@plottwist.com

Best regards,
The PlotTwist Team

PlotTwist - Collaborative Storytelling Platform
This is an automated security email from PlotTwist.`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PlotTwist Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="color: #2563eb; font-size: 28px; margin: 0; font-weight: bold;">PlotTwist</h1>
                  <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">Collaborative Storytelling Platform</p>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 24px 0; text-align: center;">Password Reset Request</h2>
                  
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">Hello ${userName},</p>
                  
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                    We received a request to reset the password for your PlotTwist account: <strong>${userEmail}</strong>
                  </p>
                  
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 32px 0; font-size: 16px;">
                    To create a new password, please click the button below:
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; line-height: 1;">
                          Reset Your Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Link -->
                  <div style="background-color: #f8fafc; padding: 24px; border-radius: 6px; margin: 32px 0; border-left: 4px solid #2563eb;">
                    <p style="color: #374151; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Can't click the button? Copy and paste this link:</p>
                    <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0; font-family: monospace;">${resetUrl}</p>
                  </div>
                  
                  <!-- Security Info -->
                  <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">Important Security Information:</p>
                    <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px;">
                      <li>This link expires in 1 hour for your security</li>
                      <li>Only use this link if you requested the password reset</li>
                      <li>If you didn't request this, you can safely ignore this email</li>
                    </ul>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0;">
                    Need help? Contact our support team at <a href="mailto:support@plottwist.com" style="color: #2563eb; text-decoration: none;">support@plottwist.com</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
                  <p style="color: #374151; margin: 0 0 8px 0; font-size: 16px;">Best regards,<br><strong>The PlotTwist Team</strong></p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.4;">
                    This is an automated security email from PlotTwist.<br>
                    PlotTwist - Collaborative Storytelling Platform
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    to: userEmail,
    from: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@plottwist.com',
    subject,
    text,
    html
  });
}