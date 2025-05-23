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

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}: ${params.subject}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
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
  const subject = "Verify Your PlotTwist Account";
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const text = `Hello ${userName},

Welcome to PlotTwist! Please verify your email address to complete your account setup.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours for security purposes.

If you didn't create an account with PlotTwist, you can safely ignore this email.

Best regards,
The PlotTwist Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; text-align: center;">Verify Your PlotTwist Account</h2>
      
      <p>Hello ${userName},</p>
      
      <p>Welcome to <strong>PlotTwist</strong>! Please verify your email address to complete your account setup.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${verificationUrl}</p>
      
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours for security purposes.</p>
      
      <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with PlotTwist, you can safely ignore this email.</p>
      
      <p style="margin-top: 30px;">Best regards,<br>
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

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
  const subject = "Reset Your PlotTwist Password";
  
  const text = `Hello ${userName},

You requested to reset your password for your PlotTwist account. If you didn't make this request, you can safely ignore this email.

To reset your password, click the link below:
[Password Reset Link - This would be implemented when you add password reset functionality]

This link will expire in 24 hours for security purposes.

If you have any questions, please contact our support team.

Best regards,
The PlotTwist Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; text-align: center;">Password Reset Request</h2>
      
      <p>Hello ${userName},</p>
      
      <p>You requested to reset your password for your PlotTwist account. If you didn't make this request, you can safely ignore this email.</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #92400e;">
          <strong>Password reset functionality will be available soon.</strong><br>
          For now, please contact support if you need help with your account.
        </p>
      </div>
      
      <p>This link will expire in 24 hours for security purposes.</p>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p style="margin-top: 30px;">Best regards,<br>
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