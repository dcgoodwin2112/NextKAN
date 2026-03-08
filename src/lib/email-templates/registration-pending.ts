interface RegistrationPendingParams {
  userName: string;
  userEmail: string;
  adminUrl: string;
}

export function registrationPendingEmail(params: RegistrationPendingParams) {
  const { userName, userEmail, adminUrl } = params;

  return {
    subject: `New registration pending approval: ${userName}`,
    html: `
      <h2>New Registration</h2>
      <p><strong>${userName}</strong> (${userEmail}) has registered and is pending approval.</p>
      <p><a href="${adminUrl}">Review pending users</a></p>
    `.trim(),
    text: `New registration from ${userName} (${userEmail}). Review at: ${adminUrl}`,
  };
}
