import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import crypto from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
const CSRF_SECRET = process.env.CSRF_SECRET || import.meta.env.CSRF_SECRET || 'fallback-secret-key-change-me';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(RESEND_API_KEY);

const YOUR_EMAIL = 'guptashine5002@gmail.com';

function validateCSRFToken(token: string, sessionId: string): boolean {
  try {
    const expectedToken = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(sessionId)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

function generateCSRFToken(sessionId: string): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(sessionId)
    .digest('hex');
}

const createEmailTemplate = (data: {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Contact Form Submission</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #D7ABC5, #6366F1);
          color: white;
          padding: 30px 40px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px;
        }
        .field {
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        .field:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .value {
          color: #1f2937;
          font-size: 16px;
          word-wrap: break-word;
        }
        .message-content {
          background: #f9fafb;
          border-left: 4px solid #D7ABC5;
          padding: 16px;
          border-radius: 0 8px 8px 0;
          margin-top: 8px;
          white-space: pre-wrap;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 40px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
        .timestamp {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 20px;
        }
        .reply-info {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
          color: #92400e;
        }
        .reply-info strong {
          color: #78350f;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 New Contact Form Submission</h1>
        </div>
        
        <div class="content">
          <div class="field">
            <div class="label">From</div>
            <div class="value">${data.firstName} ${data.lastName}</div>
          </div>
          
          <div class="field">
            <div class="label">Email</div>
            <div class="value">${data.email}</div>
          </div>
          
          ${data.company ? `
          <div class="field">
            <div class="label">Company</div>
            <div class="value">${data.company}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Subject</div>
            <div class="value">${data.subject}</div>
          </div>
          
          <div class="field">
            <div class="label">Message</div>
            <div class="message-content">${data.message}</div>
          </div>
          
          <div class="reply-info">
            <strong>💡 Quick Reply:</strong> Simply reply to this email to respond directly to ${data.firstName}!
          </div>
          
          <div class="timestamp">
            📅 Received: ${new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })}
          </div>
        </div>
        
        <div class="footer">
          <p>This message was sent from your portfolio contact form</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const company = formData.get('company') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const honeypot = formData.get('website') as string;
    const csrfToken = formData.get('csrfToken') as string;
    const sessionId = formData.get('sessionId') as string;

    if (honeypot && honeypot.trim() !== '') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid submission' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!csrfToken || !sessionId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing security tokens' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!validateCSRFToken(csrfToken, sessionId)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid security token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const suspiciousPatterns = [
      /\b(viagra|cialis|pharmacy|casino|poker|loans?|mortgage)\b/i,
      /\b(make money|work from home|guaranteed income)\b/i,
      /\b(click here|visit now|act now|limited time)\b/i,
      /(http[s]?:\/\/[^\s]+){3,}/i,
    ];

    const fullText = `${firstName} ${lastName} ${email} ${company} ${subject} ${message}`.toLowerCase();
    const isSpam = suspiciousPatterns.some(pattern => pattern.test(fullText));

    if (isSpam) {
      return new Response(JSON.stringify({ success: false, error: 'Message appears to be spam' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailResult = await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>',
      to: [YOUR_EMAIL],
      subject: `New Contact: ${subject}`,
      html: createEmailTemplate({
        firstName,
        lastName,
        email,
        company,
        subject,
        message
      }),
      replyTo: email
    });

    if (emailResult.error) {
      throw new Error('Failed to send email');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      messageId: emailResult.data?.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error - please try again later'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const sessionId = crypto.randomUUID();
    const csrfToken = generateCSRFToken(sessionId);

    return new Response(JSON.stringify({
      csrfToken,
      sessionId,
      timestamp: Date.now()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate security token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
