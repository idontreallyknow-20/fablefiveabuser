"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Mode = "signin" | "signup" | "reset";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/signup")
      .then((r) => r.json())
      .then((d) => setSignupsOpen(Boolean(d.open)))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        router.replace(params.get("next") ?? "/today");
        router.refresh();
      } else if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not create the account");
        if (data.needsConfirmation) {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw new Error(error.message);
          router.replace("/today");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
        setNotice("If that address has an account, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-6">
      <AtmosphereCanvas />
      <div className="rise w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="display text-4xl font-light tracking-tight text-ink">Orbit</h1>
          <p className="mt-2 text-sm text-ink-faint">A quiet place for the day</p>
        </div>

        <form onSubmit={submit} className="surface flex flex-col gap-4 p-6">
          {mode === "signup" && (
            <Field
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {mode !== "reset" && (
            <Field
              label="Password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          )}

          {error && <p className="text-[13px] text-danger">{error}</p>}
          {notice && <p className="text-[13px] text-ok">{notice}</p>}

          <Button variant="primary" size="lg" type="submit" loading={loading} className="mt-1 w-full">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>

          <div className="flex items-center justify-between text-[13px]">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  className="text-ink-faint transition-colors hover:text-ink-dim"
                  onClick={() => setMode("reset")}
                >
                  Forgot password
                </button>
                {signupsOpen && (
                  <button
                    type="button"
                    className="text-accent transition-colors hover:opacity-80"
                    onClick={() => setMode("signup")}
                  >
                    Create account
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="text-ink-faint transition-colors hover:text-ink-dim"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
