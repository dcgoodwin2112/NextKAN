"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-text-muted">
        If an account exists with that email, a new verification link has been
        sent.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <p className="text-sm text-text-muted text-center">
        Enter your email to receive a new verification link.
      </p>
      <div className="space-y-2">
        <Label htmlFor="resend-email">Email</Label>
        <Input
          id="resend-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Resend Verification"}
      </Button>
    </form>
  );
}
