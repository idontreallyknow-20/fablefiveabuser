"use client";

import { useState } from "react";
import {
  useCreateTeam,
  useJoinTeam,
  useLeaveTeam,
  useTeam,
  useTeamRealtime,
  useTeamStreak,
} from "@/lib/data/teams";
import { useProfile } from "@/lib/data/profile";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function TeamPage() {
  const { data, isLoading } = useTeam();
  useTeamRealtime(data?.team.id);
  const { data: streak = 0 } = useTeamStreak(data?.team.id);
  const { data: profile } = useProfile();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const leaveTeam = useLeaveTeam();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const memberName = profile?.display_name || "";

  if (isLoading) return null;

  if (!data) {
    return (
      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <section aria-label="Create a team" className="surface flex flex-col gap-3 rounded-2xl p-5">
          <h2 className="eyebrow">Create</h2>
          <Field
            label="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            variant="primary"
            loading={createTeam.isPending}
            onClick={async () => {
              try {
                await createTeam.mutateAsync({ name: name.trim(), memberName });
              } catch (e) {
                toast(e instanceof Error ? e.message : "Could not create the team");
              }
            }}
          >
            Create
          </Button>
        </section>
        <section aria-label="Join a team" className="surface flex flex-col gap-3 rounded-2xl p-5">
          <h2 className="eyebrow">Join</h2>
          <Field
            label="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tnum font-mono"
          />
          <Button
            variant="secondary"
            loading={joinTeam.isPending}
            onClick={async () => {
              try {
                await joinTeam.mutateAsync({ code: code.trim(), memberName });
              } catch (e) {
                toast(e instanceof Error ? e.message : "Could not join the team");
              }
            }}
          >
            Join
          </Button>
        </section>
      </div>
    );
  }

  const { team, members } = data;
  const me = members.find((m) => m.user_id === profile?.id);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section aria-label="Team" className="surface rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-[22px] font-medium text-ink">{team.name || "Team"}</h2>
          {streak > 0 && (
            <span className="tnum font-mono text-[13px] text-accent">{streak}d streak</span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="eyebrow">Invite code</span>
          <code className="tnum rounded-lg border border-line bg-bg1 px-2.5 py-1 font-mono text-[13px] text-ink">
            {team.invite_code}
          </code>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(team.invite_code);
              toast("Copied");
            }}
          >
            Copy
          </Button>
        </div>
      </section>

      <section aria-label="Members" className="surface rounded-2xl p-5">
        <h2 className="eyebrow mb-3">Members</h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg2 font-mono text-[12px] uppercase text-ink-dim">
                {(m.display_name || "?").slice(0, 1)}
              </span>
              <span className="flex-1 text-[14px] text-ink">
                {m.display_name || "…"}
                {m.user_id === profile?.id && (
                  <span className="ml-1.5 font-mono text-[11px] text-ink-faint">you</span>
                )}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <Button variant="destructive" size="sm" onClick={() => setConfirmLeave(true)}>
          Leave team
        </Button>
      </div>

      <Confirm
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={async () => {
          if (me) await leaveTeam.mutateAsync({ teamId: team.id, userId: me.user_id });
        }}
        title="Leave team"
        body="Shared tasks stay with the team."
        confirmLabel="Leave"
        destructive
      />
    </div>
  );
}
