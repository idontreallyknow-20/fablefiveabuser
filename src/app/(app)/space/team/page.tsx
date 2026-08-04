"use client";

import { useState } from "react";
import {
  useClaimTeamDay,
  useCreateTeam,
  useJoinTeam,
  useLeaveTeam,
  useTeam,
  useTeamDay,
  useTeamRealtime,
  useTeamStreak,
  useTeamToday,
} from "@/lib/data/teams";
import { useProfile } from "@/lib/data/profile";
import { SharedTasks } from "@/components/team/SharedTasks";
import { TeamNotes } from "@/components/team/TeamNotes";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Confirm } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconCheck } from "@/components/ui/Icons";

export default function TeamPage() {
  const { data, isLoading } = useTeam();
  useTeamRealtime(data?.team.id);
  const { data: streak = 0 } = useTeamStreak(data?.team.id);
  const { data: today = [] } = useTeamToday(data?.team.id);
  const { data: day } = useTeamDay(data?.team.id);
  const { data: profile } = useProfile();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const leaveTeam = useLeaveTeam();
  const claim = useClaimTeamDay();
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
  const claimed = Boolean(day?.bonus_at);
  const alignedCount = today.filter(
    (m) => m.priorities_total > 0 && m.priorities_done >= m.priorities_total,
  ).length;
  const aligned = today.length > 0 && alignedCount === today.length;

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="display text-[26px] font-medium text-ink">{team.name || "Team"}</h1>
        <button
          title="Copy"
          onClick={() => {
            void navigator.clipboard.writeText(team.invite_code);
            toast("Copied");
          }}
          className="tnum rounded-lg border border-line bg-bg1 px-2.5 py-1 font-mono text-[12px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
        >
          {team.invite_code}
        </button>
        {streak > 0 && (
          <span className="tnum font-mono text-[12.5px] text-accent">{streak}d</span>
        )}
        {claimed ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            aligned
          </span>
        ) : (
          today.length > 0 && (
            <span className="tnum font-mono text-[11.5px] text-ink-faint">
              {alignedCount}/{today.length} today
            </span>
          )
        )}
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <SharedTasks teamId={team.id} members={members} />

        <div className="flex flex-col gap-4">
          <section aria-label="Members" className="surface rounded-2xl p-5">
            <h2 className="eyebrow mb-3">Members</h2>
            <ul className="flex flex-col gap-2.5">
              {members.map((m) => {
                const t = today.find((x) => x.user_id === m.user_id);
                const done = t?.priorities_done ?? 0;
                const total = t?.priorities_total ?? 0;
                const clear = total > 0 && done >= total;
                return (
                  <li key={m.user_id} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] uppercase ${
                        clear ? "bg-accent-soft text-accent" : "bg-bg2 text-ink-dim"
                      }`}
                    >
                      {(m.display_name || "?").slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                      {m.display_name || "…"}
                      {m.user_id === profile?.id && (
                        <span className="ml-1.5 font-mono text-[11px] text-ink-faint">you</span>
                      )}
                    </span>
                    <span className="tnum shrink-0 font-mono text-[11.5px] text-ink-faint">
                      {total === 0 ? "—" : `${done}/${total}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Streak" className="surface rounded-2xl p-5">
            <h2 className="eyebrow mb-3">Streak</h2>
            <p className="display tnum text-[32px] leading-none text-ink">
              {streak}
              <span className="ml-1.5 font-mono text-[12px] text-ink-faint">d</span>
            </p>
            {claimed ? (
              <p className="mt-3 flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-accent">
                <IconCheck size={12} /> aligned
              </p>
            ) : aligned ? (
              <button
                onClick={() => claim.mutate(team.id)}
                disabled={claim.isPending}
                className="mt-3 h-9 w-full rounded-xl border border-(--accent)/50 bg-accent-soft text-[13px] font-medium text-accent transition-colors hover:border-(--accent)"
              >
                Claim the day
              </button>
            ) : null}
          </section>

          <TeamNotes team={team} />

          <div>
            <Button variant="destructive" size="sm" onClick={() => setConfirmLeave(true)}>
              Leave team
            </Button>
          </div>
        </div>
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
