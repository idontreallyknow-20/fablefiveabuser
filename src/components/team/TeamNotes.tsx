"use client";

import { useEffect, useRef, useState } from "react";
import { useSaveTeamNotes, type Team } from "@/lib/data/teams";

export function TeamNotes({ team }: { team: Team }) {
  const save = useSaveTeamNotes();
  const [value, setValue] = useState(team.notes);
  const dirty = useRef(false);
  const teamId = team.id;
  const saveNotes = save.mutate;

  // adopt remote edits, but never mid-typing
  useEffect(() => {
    if (!dirty.current) setValue(team.notes);
  }, [team.notes]);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      saveNotes({ teamId, notes: value });
    }, 800);
    return () => clearTimeout(t);
  }, [value, teamId, saveNotes]);

  return (
    <section aria-label="Notes" className="surface rounded-2xl p-5">
      <h2 className="eyebrow mb-3">Notes</h2>
      <label htmlFor="team-notes" className="sr-only">
        Shared notes
      </label>
      <textarea
        id="team-notes"
        value={value}
        onChange={(e) => {
          dirty.current = true;
          setValue(e.target.value);
        }}
        rows={9}
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-transparent bg-transparent px-2.5 py-2 font-mono text-[12.5px] leading-relaxed text-ink-dim transition-colors hover:border-line focus:border-line-strong focus:bg-bg1/50 focus:text-ink focus:outline-none"
      />
    </section>
  );
}
