"use client";

import { useState } from "react";
import { useProfile, useUpdateProfile } from "@/lib/data/profile";
import { useSettings } from "@/lib/settings/store";
import { ActionButton } from "@/components/ui/Button";
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

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { settings, set } = useSettings();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [appName, setAppName] = useState("");
  const [pin, setPin] = useState("");

  // sync form fields once per loaded profile (render-derived state)
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  if (profile && loadedProfileId !== profile.id) {
    setLoadedProfileId(profile.id);
    setDisplayName(profile.display_name);
    setAppName(profile.app_name);
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="surface space-y-4 p-5" aria-label="Identity">
        <h2 className="eyebrow">Identity</h2>
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
    </div>
  );
}
