import { redirect } from "next/navigation";
import { getUserRegistrationMode } from "@/lib/services/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  const mode = getUserRegistrationMode();
  if (mode === "disabled") redirect("/login");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            {mode === "approval"
              ? "Registration requires admin approval."
              : "Create your account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm mode={mode} />
        </CardContent>
      </Card>
    </div>
  );
}
