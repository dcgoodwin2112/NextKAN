import { redirect } from "next/navigation";
import { getUserRegistrationMode } from "@/lib/services/settings";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  const mode = getUserRegistrationMode();
  if (mode === "disabled") redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">Create Account</h1>
        <p className="text-center text-sm text-text-muted">
          {mode === "approval"
            ? "Registration requires admin approval."
            : "Create your account to get started."}
        </p>
        <RegisterForm mode={mode} />
      </div>
    </div>
  );
}
