import { getUserRegistrationMode } from "@/lib/services/settings";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const registrationEnabled = getUserRegistrationMode() !== "disabled";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        <LoginForm registrationEnabled={registrationEnabled} />
      </div>
    </div>
  );
}
