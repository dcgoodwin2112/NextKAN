// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn().mockResolvedValue({});

vi.mock(import("nodemailer"), async () => {
  return {
    default: {
      createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
    },
  };
});

import {
  ConsoleEmailService,
  SmtpEmailService,
  getEmailService,
  resetEmailService,
} from "./email";

describe("ConsoleEmailService", () => {
  it("logs email to console", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new ConsoleEmailService();

    await service.send({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(spy).toHaveBeenCalledWith("[Email]", {
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });
    spy.mockRestore();
  });
});

describe("SmtpEmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends email via nodemailer transport", async () => {
    const service = new SmtpEmailService();

    await service.send({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Body</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Body</p>",
      })
    );
  });

  it("joins array recipients with comma", async () => {
    const service = new SmtpEmailService();

    await service.send({
      to: ["a@example.com", "b@example.com"],
      subject: "Test",
      html: "<p>Body</p>",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com, b@example.com",
      })
    );
  });
});

describe("getEmailService", () => {
  beforeEach(() => {
    resetEmailService();
  });

  it("returns ConsoleEmailService by default", () => {
    delete process.env.EMAIL_PROVIDER;
    const service = getEmailService();
    expect(service).toBeInstanceOf(ConsoleEmailService);
  });

  it("returns SmtpEmailService when EMAIL_PROVIDER=smtp", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    const service = getEmailService();
    expect(service).toBeInstanceOf(SmtpEmailService);
  });
});
