"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/today");
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-6">
      <AtmosphereCanvas />
      <form onSubmit={submit} className="rise surface w-full max-w-sm space-y-4 p-6">
        <h1 className="display text-xl text-ink">Set a new password</h1>
        <Field
          label="New password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Field
          label="Confirm password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Button variant="primary" size="lg" type="submit" loading={loading} className="w-full">
          Save password
        </Button>
      </form>
    </main>
  );
}
