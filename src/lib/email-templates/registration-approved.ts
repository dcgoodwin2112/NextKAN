interface RegistrationApprovedParams {
  loginUrl: string;
}

export function registrationApprovedEmail(params: RegistrationApprovedParams) {
  const { loginUrl } = params;

  return {
    subject: "Your account has been approved",
    html: `
      <h2>Account Approved</h2>
      <p>Your account has been approved. You can now sign in:</p>
      <p><a href="${loginUrl}">Sign In</a></p>
    `.trim(),
    text: `Your account has been approved. Sign in at: ${loginUrl}`,
  };
}
