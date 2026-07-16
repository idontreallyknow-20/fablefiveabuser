"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/data/profile";
import { useSettings } from "@/lib/settings/store";
import { Button, ActionButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AccountPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { settings, set } = useSettings();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [appName, setAppName] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAppName(profile.app_name);
    }
  }, [profile]);

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <div className="space-y-8 pb-8">
      <section className="surface space-y-4 p-5" aria-label="Identity">
        <h2 className="eyebrow">Identity</h2>
        <Field label="Email" value={email} readOnly disabled />
        <Field
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Field
          label="Application name"
          hint="What this place is called, everywhere it says its own name"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          maxLength={24}
        />
        <div className="flex justify-end">
          <ActionButton
            variant="primary"
            onAction={async () => {
              await updateProfile.mutateAsync({
                display_name: displayName.trim(),
                app_name: appName.trim() || "Orbit",
              });
            }}
          >
            Save changes
          </ActionButton>
        </div>
      </section>

      <section className="surface space-y-4 p-5" aria-label="Password">
        <h2 className="eyebrow">Password</h2>
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <ActionButton
            variant="secondary"
            disabled={password.length < 8}
            onAction={async () => {
              const { error } = await supabaseBrowser().auth.updateUser({ password });
              if (error) throw new Error(error.message);
              setPassword("");
              toast("Password updated", "success");
            }}
          >
            Update password
          </ActionButton>
        </div>
      </section>

      <section className="surface space-y-3 p-5" aria-label="PIN lock">
        <h2 className="eyebrow">PIN lock</h2>
        <Toggle
          checked={settings.pinLock.enabled}
          onChange={async (enabled) => {
            if (!enabled) {
              set({ pinLock: { enabled: false, hash: "" } });
              return;
            }
            if (pin.length < 4) {
              toast("Enter a PIN of at least 4 digits first", "error");
              return;
            }
            set({ pinLock: { enabled: true, hash: await sha256(pin) } });
            setPin("");
            toast("PIN lock on", "success");
          }}
          label="Ask for a PIN when returning to this device"
          description="A light local lock for shared rooms. Not encryption."
        />
        {!settings.pinLock.enabled && (
          <Field
            label="PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        )}
      </section>

      <section className="surface flex items-center justify-between p-5" aria-label="Session">
        <div>
          <h2 className="eyebrow mb-1">Session</h2>
          <p className="text-sm text-ink-faint">Signed in on this device</p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await supabaseBrowser().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
