import Link from "next/link";
import { verifyEmailAction } from "@/lib/actions/registration";
import { ResendVerificationForm } from "./ResendVerificationForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-6 p-8 text-center">
          <h1 className="text-2xl font-bold">Verify Email</h1>
          <p className="text-text-muted">No verification token provided.</p>
          <ResendVerificationForm />
        </div>
      </div>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-2xl font-bold">Verify Email</h1>

        {result.success && result.mode === "open" && (
          <div className="space-y-4">
            <div className="rounded bg-success-subtle p-4 text-sm text-success-text">
              Email verified! You can now sign in.
            </div>
            <Link
              href="/login"
              className="inline-block text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        )}

        {result.success && result.mode === "approval" && (
          <div className="rounded bg-success-subtle p-4 text-sm text-success-text">
            Email verified! Your account is pending admin approval.
          </div>
        )}

        {!result.success && (
          <div className="space-y-4">
            <div className="rounded bg-danger-subtle p-4 text-sm text-danger-text">
              Invalid or expired verification link.
            </div>
            <ResendVerificationForm />
          </div>
        )}
      </div>
    </div>
  );
}
