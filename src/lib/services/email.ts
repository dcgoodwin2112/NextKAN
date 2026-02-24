import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    console.log("[Email]", {
      to: message.to,
      subject: message.subject,
      text: message.text || "(html only)",
    });
  }
}

export class SmtpEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@example.com",
      to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

let instance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (instance) return instance;

  const provider = process.env.EMAIL_PROVIDER || "console";

  if (provider === "smtp") {
    instance = new SmtpEmailService();
  } else {
    instance = new ConsoleEmailService();
  }

  return instance;
}

/** Reset singleton (for testing) */
export function resetEmailService(): void {
  instance = null;
}
