export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  render: (data: Record<string, unknown>) => { html: string; text: string };
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    name: "welcome",
    subject: "Welcome to AI Fitness Platform!",
    render: (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AI Fitness! 💪</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name || "there"},</h2>
              <p>We're excited to have you on board! AI Fitness Platform combines cutting-edge AI technology with proven fitness science to help you reach your goals faster.</p>
              <p>Here's what you can do:</p>
              <ul>
                <li>Track workouts with smart exercise recognition</li>
                <li>Get personalized nutrition plans</li>
                <li>Monitor progress with detailed analytics</li>
                <li>Join fitness challenges with friends</li>
              </ul>
              <a href="${data.dashboardUrl || "https://aifitness.app/dashboard"}" class="button">Get Started</a>
            </div>
            <div class="footer">
              <p>© 2024 AI Fitness Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to AI Fitness Platform!\n\nHi ${data.name || "there"},\n\nWe're excited to have you on board! Get started at ${data.dashboardUrl || "https://aifitness.app/dashboard"}`,
    }),
  },
  challenge: {
    name: "challenge",
    subject: "You've been challenged!",
    render: (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px; }
            .challenge-box { background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
            .challenge-name { font-size: 24px; font-weight: bold; color: #1f2937; }
            .challenge-desc { color: #6b7280; margin-top: 8px; }
            .button { display: inline-block; background: #f5576c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Challenge Alert!</h1>
            </div>
            <div class="content">
              <h2>${data.challengerName || "Someone"} challenged you!</h2>
              <div class="challenge-box">
                <div class="challenge-name">${data.challengeName || "Fitness Challenge"}</div>
                <div class="challenge-desc">${data.challengeDescription || "Complete this challenge to earn points!"}</div>
              </div>
              <p>Duration: ${data.duration || "7 days"}</p>
              <p>Reward: ${data.reward || "500 XP"}</p>
              <a href="${data.challengeUrl || "https://aifitness.app/challenges"}" class="button">Accept Challenge</a>
            </div>
            <div class="footer">
              <p>© 2024 AI Fitness Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Challenge Alert!\n\n${data.challengerName || "Someone"} challenged you to "${data.challengeName || "Fitness Challenge"}"!\n\nAccept at ${data.challengeUrl || "https://aifitness.app/challenges"}`,
    }),
  },
  achievement: {
    name: "achievement",
    subject: "New Achievement Unlocked! 🎉",
    render: (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { padding: 40px; text-align: center; }
            .badge { font-size: 72px; margin: 20px 0; }
            .achievement-name { font-size: 24px; font-weight: bold; color: #1f2937; }
            .achievement-desc { color: #6b7280; margin-top: 8px; }
            .xp { font-size: 32px; font-weight: bold; color: #4facfe; margin-top: 16px; }
            .button { display: inline-block; background: #4facfe; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Achievement Unlocked!</h1>
            </div>
            <div class="content">
              <div class="badge">${data.badgeEmoji || "🏅"}</div>
              <div class="achievement-name">${data.achievementName || "Achievement"}</div>
              <div class="achievement-desc">${data.achievementDescription || "Great job!"}</div>
              <div class="xp">+${data.xp || 100} XP</div>
              <a href="${data.profileUrl || "https://aifitness.app/profile"}" class="button">View Profile</a>
            </div>
            <div class="footer">
              <p>© 2024 AI Fitness Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Achievement Unlocked!\n\n${data.achievementName || "Achievement"}: ${data.achievementDescription || "Great job!"}\n+${data.xp || 100} XP\n\nView at ${data.profileUrl || "https://aifitness.app/profile"}`,
    }),
  },
  passwordReset: {
    name: "passwordReset",
    subject: "Reset your password",
    render: (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #374151; padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .button { display: inline-block; background: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .note { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 14px; }
            .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name || "there"},</h2>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              <a href="${data.resetUrl || "#"}" class="button">Reset Password</a>
              <div class="note">
                <strong>Note:</strong> This link expires in ${data.expiresIn || "1 hour"}. If you didn't request this, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>© 2024 AI Fitness Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Password Reset\n\nHi ${data.name || "there"},\n\nReset your password: ${data.resetUrl || "#"}\n\nThis link expires in ${data.expiresIn || "1 hour"}.`,
    }),
  },
  weeklyReport: {
    name: "weeklyReport",
    subject: "Your Weekly Fitness Report 📊",
    render: (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 40px; text-align: center; }
            .header h1 { color: #1f2937; margin: 0; font-size: 28px; }
            .content { padding: 40px; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
            .stat-card { background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: bold; color: #1f2937; }
            .stat-label { color: #6b7280; font-size: 14px; }
            .footer { padding: 20px 40px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Week in Review</h1>
            </div>
            <div class="content">
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${data.workouts || 0}</div>
                  <div class="stat-label">Workouts</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.calories || 0}</div>
                  <div class="stat-label">Calories Burned</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.duration || "0h"}</div>
                  <div class="stat-label">Active Time</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.streak || 0}</div>
                  <div class="stat-label">Day Streak</div>
                </div>
              </div>
              <p>${data.message || "Keep up the great work!"}</p>
            </div>
            <div class="footer">
              <p>© 2024 AI Fitness Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Weekly Report\n\nWorkouts: ${data.workouts || 0}\nCalories: ${data.calories || 0}\nDuration: ${data.duration || "0h"}\nStreak: ${data.streak || 0}\n\n${data.message || "Keep up the great work!"}`,
    }),
  },
};

let transporter: { sendMail: (options: EmailOptions) => Promise<{ messageId: string }> } | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const nodemailer = await import("nodemailer");
  transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = await getTransporter();
    const from =
      options.from || process.env.EMAIL_FROM || "AI Fitness <noreply@aifitness.app>";

    await transport.sendMail({
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      from,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    return true;
  } catch {
    return false;
  }
}

export async function sendTemplateEmail(
  templateName: string,
  to: string | string[],
  data: Record<string, unknown>
): Promise<boolean> {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) return false;

  const { html, text } = template.render(data);

  return sendEmail({
    to,
    subject: template.subject,
    html,
    text,
  });
}

export function getEmailTemplate(name: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES[name];
}

export function listEmailTemplates(): string[] {
  return Object.keys(EMAIL_TEMPLATES);
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = await getTransporter();
    await (transport as { verify: () => Promise<boolean> }).verify();
    return true;
  } catch {
    return false;
  }
}
