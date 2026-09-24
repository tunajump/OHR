const nodemailer = require('nodemailer');

// Single Master Mailbox configuration
const SYSTEM_FROM_EMAIL = process.env.SYSTEM_FROM_EMAIL || 'admin@ohreferral.co.uk';
const SYSTEM_SENDER_NAME = process.env.SYSTEM_SENDER_NAME || 'OHReferral';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ohreferral.co.uk';
const CONTACT_DEFAULT_RECEIVER = process.env.CONTACT_DEFAULT_RECEIVER || 'admin@ohreferral.co.uk';

// In-memory log of dispatched emails for audit & testing
const emailDispatchLog = [];

/**
 * Creates an active Nodemailer transport if SMTP credentials are configured.
 */
function getTransporter() {
  if (process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
}

/**
 * Generic email dispatcher with fallback logging.
 * All outgoing emails default to from: "OHReferral <admin@ohreferral.co.uk>".
 */
async function sendEmail({
  to,
  subject,
  text,
  html,
  replyTo,
  from = `"${SYSTEM_SENDER_NAME}" <${SYSTEM_FROM_EMAIL}>`
}) {
  const emailRecord = {
    id: emailDispatchLog.length + 1,
    from,
    to,
    replyTo: replyTo || SYSTEM_FROM_EMAIL,
    subject,
    text,
    html: html || text,
    timestamp: new Date().toISOString()
  };

  emailDispatchLog.push(emailRecord);

  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: emailRecord.replyTo,
        subject,
        text,
        html: emailRecord.html
      });
      console.log(`📧 [EMAIL SENT] From: ${from} | To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, record: emailRecord };
    } catch (err) {
      console.error(`⚠️ [EMAIL ERROR] Failed to send email via SMTP to ${to}:`, err.message);
      return { success: false, error: err.message, record: emailRecord };
    }
  } else {
    console.log(`✉️ [EMAIL DISPATCH LOG] (No SMTP configured - recorded in system dispatch log)`);
    console.log(`   From:    ${from}`);
    console.log(`   To:      ${to}`);
    console.log(`   ReplyTo: ${emailRecord.replyTo}`);
    console.log(`   Subject: ${subject}`);
    return { success: true, simulated: true, record: emailRecord };
  }
}

/**
 * Contact form enquiry handler.
 * Automatically routes all contact queries to admin@ohreferral.co.uk by default.
 */
async function sendContactEnquiry({ name, email, phone, subject, message }) {
  const enquirySubject = subject ? `[OHReferral Contact] ${subject}` : `[OHReferral Contact] New Enquiry from ${name || email}`;
  
  const textBody = `
New Contact / Support Request Received
--------------------------------------
Sender Name:    ${name || 'Not provided'}
Sender Email:   ${email}
Sender Phone:   ${phone || 'Not provided'}
Submitted At:   ${new Date().toLocaleString('en-GB')}

Message:
${message}

--------------------------------------
This email was routed to ${CONTACT_DEFAULT_RECEIVER} from OHReferral Platform.
Reply directly to this email to contact the sender (${email}).
`.trim();

  const htmlBody = `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
  <div style="background-color: #2563eb; color: #ffffff; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px;">OHReferral &bull; New Contact Enquiry</h2>
  </div>
  
  <p style="font-size: 14px; margin-bottom: 16px;">
    A new contact request has been received on the OHReferral platform:
  </p>

  <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 0; font-weight: bold; width: 130px; color: #64748b;">Sender Name:</td>
      <td style="padding: 8px 0;">${name || 'Not provided'}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Sender Email:</td>
      <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Phone:</td>
      <td style="padding: 8px 0;">${phone || 'Not provided'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Submitted:</td>
      <td style="padding: 8px 0;">${new Date().toLocaleString('en-GB')}</td>
    </tr>
  </table>

  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
    <strong>Message:</strong><br/>
    <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${message}</p>
  </div>

  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    Routed automatically to <strong>${CONTACT_DEFAULT_RECEIVER}</strong>. You can click "Reply" in your email client to respond directly to ${email}.
  </p>
</div>
`;

  return sendEmail({
    to: CONTACT_DEFAULT_RECEIVER,
    replyTo: email,
    subject: enquirySubject,
    text: textBody,
    html: htmlBody,
    from: `"${SYSTEM_SENDER_NAME}" <${SYSTEM_FROM_EMAIL}>`
  });
}

/**
 * Notify Manager / HR on behalf of employee suggestion.
 */
async function sendEmployeeSuggestionNotification({ employeeName, employeeEmail, companyName, managerEmail, message }) {
  const subject = `Occupational Health Support for ${companyName} via OHReferral`;
  
  const textBody = `
Hello,

An employee from ${companyName}${employeeName ? ` (${employeeName})` : ''} has suggested exploring Occupational Health support for your team through the UK OHReferral platform.

Suggested Message:
${message || 'We would like to explore Occupational Health services for our team.'}

Learn more about available local OH clinics: https://ohreferral.co.uk/business/learn-more

Best regards,
The OHReferral Team
admin@ohreferral.co.uk
`.trim();

  return sendEmail({
    to: managerEmail,
    replyTo: employeeEmail && employeeEmail !== 'N/A' ? employeeEmail : SYSTEM_FROM_EMAIL,
    subject,
    text: textBody,
    from: `"${SYSTEM_SENDER_NAME}" <${SYSTEM_FROM_EMAIL}>`
  });
}

/**
 * Send Account Email Verification Link
 */
async function sendAccountVerificationEmail({ to, name, verificationUrl, token }) {
  const subject = 'Verify your OHReferral Account';
  const url = verificationUrl || `https://ohreferral.co.uk/verify-email?token=${token}`;
  
  const textBody = `
Hello ${name || ''},

Thank you for registering with OHReferral.

Please verify your email address to activate your account and confirm your organization:
${url}

This verification link will remain active for 48 hours. If you did not create an account with OHReferral, please disregard this email.

Best regards,
The OHReferral Team
admin@ohreferral.co.uk
`.trim();

  const htmlBody = `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="background-color: #4f46e5; color: #ffffff; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">OHReferral &bull; Account Verification</h2>
  </div>
  
  <p style="font-size: 15px; margin-bottom: 16px; line-height: 1.5;">
    Hello <strong>${name || 'there'}</strong>,
  </p>
  <p style="font-size: 14px; margin-bottom: 24px; line-height: 1.6; color: #475569;">
    Thank you for registering with <strong>OHReferral</strong>. Please confirm your email address to activate your account, verify your organization, and enable referral dispatching.
  </p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
      Verify My Email Address
    </a>
  </div>

  <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px;">
    Or copy and paste this verification URL into your browser:<br/>
    <a href="${url}" style="color: #4f46e5; word-break: break-all; font-size: 12px;">${url}</a>
  </p>

  <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    This link will expire in 48 hours. If you did not create an account on OHReferral, you can safely ignore this email.
  </p>
</div>
`;

  return sendEmail({
    to,
    subject,
    text: textBody,
    html: htmlBody,
    from: `"${SYSTEM_SENDER_NAME}" <${SYSTEM_FROM_EMAIL}>`
  });
}

module.exports = {
  SYSTEM_FROM_EMAIL,
  ADMIN_EMAIL,
  CONTACT_DEFAULT_RECEIVER,
  emailDispatchLog,
  sendEmail,
  sendContactEnquiry,
  sendEmployeeSuggestionNotification,
  sendAccountVerificationEmail
};

