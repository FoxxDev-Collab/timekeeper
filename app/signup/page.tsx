"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function SignUpPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setLoading(true);
    try {
      const ok = await register(email, password);
      if (ok) {
        // Redirect to sign in after success
        window.location.href = "/signin";
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-muted bg-card/60 backdrop-blur">
        <CardContent className="pt-6">
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading || password !== confirm} className="w-full">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <div className="text-sm text-muted-foreground mt-4">
            Already have an account? <Link className="underline" href="/signin">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


