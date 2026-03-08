interface RegistrationVerifyParams {
  verifyUrl: string;
}

export function registrationVerifyEmail(params: RegistrationVerifyParams) {
  const { verifyUrl } = params;

  return {
    subject: "Verify your email address",
    html: `
      <h2>Welcome!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `.trim(),
    text: `Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}
