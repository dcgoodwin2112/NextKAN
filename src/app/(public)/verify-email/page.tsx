import Link from "next/link";
import { verifyEmailAction } from "@/lib/actions/registration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verify Email</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-text-muted">No verification token provided.</p>
            <ResendVerificationForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verify Email</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
