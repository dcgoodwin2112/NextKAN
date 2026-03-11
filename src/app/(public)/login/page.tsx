import { getUserRegistrationMode } from "@/lib/services/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const registrationEnabled = getUserRegistrationMode() !== "disabled";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm registrationEnabled={registrationEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
