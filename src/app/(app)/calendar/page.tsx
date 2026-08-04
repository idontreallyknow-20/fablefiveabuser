"use client";

import { useMemo, useState } from "react";
import {
  todayISO,
  useCreateTask,
  useTasks,
  useTasksRealtime,
  useUpdateTask,
  type Task,
} from "@/lib/data/tasks";
import { useRoutines } from "@/lib/data/routines";
import {
  useCalendarStatus,
  type OrbitEvent,
} from "@/components/calendar/TodayEvents";
import { useQuery } from "@tanstack/react-query";
import { mergeCalendar, type CalendarItem } from "@/lib/calendar/local";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/Icons";

type View = "month" | "week" | "agenda";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Monday-start week */
function weekStartOf(s: string): string {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return iso(d);
}

function monthLabel(s: string): string {
  return parseISO(s).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function useMonthEvents(enabled: boolean) {
  return useQuery<{ events: OrbitEvent[] }>({
    queryKey: ["google", "events", "month"],
    queryFn: async () => {
      const res = await fetch("/api/google/events?range=month");
      if (!res.ok) throw new Error("events failed");
      return res.json();
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });
}

function ItemChip({
  item,
  onOpen,
  draggable,
}: {
  item: CalendarItem;
  onOpen: () => void;
  draggable: boolean;
}) {
  const tone =
    item.kind === "event"
      ? "border-l-2 border-(--accent)/70"
      : item.kind === "routine"
        ? "opacity-60"
        : item.ghost
          ? "opacity-45"
          : "";
  return (
    <button
      onClick={onOpen}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/orbit-task", item.sourceId);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[12px] transition-colors hover:bg-bg2 ${tone} ${
        item.completed ? "text-ink-faint line-through" : "text-ink-dim"
      }`}
    >
      {item.time && <span className="tnum shrink-0 font-mono text-[10.5px] text-ink-faint">{item.time}</span>}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

export default function CalendarPage() {
  useTasksRealtime();
  const today = todayISO();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<Task | null>(null);
  const [quickTitle, setQuickTitle] = useState("");

  const { data: tasks = [] } = useTasks();
  const { data: routines = [] } = useRoutines();
  const { data: calStatus } = useCalendarStatus();
  const { data: eventsData } = useMonthEvents(Boolean(calStatus?.connected));
  const update = useUpdateTask();
  const create = useCreateTask();

  // visible window
  const { from, to, days } = useMemo(() => {
    if (view === "month") {
      const d = parseISO(anchor);
      const first = iso(new Date(d.getFullYear(), d.getMonth(), 1));
      const start = weekStartOf(first);
      const list = Array.from({ length: 42 }, (_, i) => addDays(start, i));
      return { from: list[0], to: list[41], days: list };
    }
    if (view === "week") {
      const start = weekStartOf(anchor);
      const list = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { from: list[0], to: list[6], days: list };
    }
    const list = Array.from({ length: 14 }, (_, i) => addDays(today, i));
    return { from: list[0], to: list[13], days: list };
  }, [view, anchor, today]);

  const buckets = useMemo(
    () =>
      mergeCalendar({
        tasks,
        events: eventsData?.events ?? [],
        routines,
        from,
        to,
      }),
    [tasks, eventsData, routines, from, to],
  );

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const anchorMonth = parseISO(anchor).getMonth();

  const step = (dir: 1 | -1) => {
    if (view === "month") {
      const d = parseISO(anchor);
      setAnchor(iso(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    } else {
      setAnchor(addDays(anchor, dir * 7));
    }
  };

  const openItem = (item: CalendarItem) => {
    if (item.kind === "task") {
      const t = taskById.get(item.sourceId);
      if (t) setEditing(t);
    }
  };

  const dropTask = (date: string) => (e: React.DragEvent) => {
    const id = e.dataTransfer.getData("text/orbit-task");
    if (!id) return;
    e.preventDefault();
    update.mutate({ id, patch: { due_date: date } });
  };

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle("");
    await create.mutateAsync({ title, due_date: selected });
  };

  const selectedItems = buckets.get(selected) ?? [];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="display text-[26px] font-medium tracking-tight text-ink">
            {view === "agenda" ? "Next two weeks" : monthLabel(view === "week" ? weekStartOf(anchor) : anchor)}
          </h1>
          {view !== "agenda" && (
            <div className="flex items-center">
              <Button variant="quiet" size="sm" aria-label="Previous" onClick={() => step(-1)}>
                <IconChevronLeft size={15} />
              </Button>
              <Button variant="quiet" size="sm" aria-label="Next" onClick={() => step(1)}>
                <IconChevronRight size={15} />
              </Button>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  setAnchor(today);
                  setSelected(today);
                }}
              >
                Today
              </Button>
            </div>
          )}
        </div>
        <Segmented
          label="Calendar view"
          size="sm"
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
            { value: "agenda", label: "Agenda" },
          ]}
        />
      </header>

      {view === "month" && (
        <div className="surface overflow-hidden rounded-2xl">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((d) => (
              <div key={d} className="eyebrow px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              // month cells show tasks and events; routines live in the day panel
              const items = (buckets.get(date) ?? []).filter((i) => i.kind !== "routine");
              const inMonth = parseISO(date).getMonth() === anchorMonth;
              const isToday = date === today;
              const isSelected = date === selected;
              return (
                <div
                  key={date}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(date)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(date)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={dropTask(date)}
                  className={`min-h-[92px] cursor-pointer border-b border-r border-line/60 p-1.5 align-top transition-colors last:border-r-0 hover:bg-bg1/60 ${
                    inMonth ? "" : "opacity-40"
                  } ${isSelected ? "bg-bg1" : ""}`}
                >
                  <span
                    className={`tnum mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11.5px] ${
                      isToday ? "bg-(--accent) font-semibold text-bg0" : "text-ink-faint"
                    }`}
                  >
                    {parseISO(date).getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {items.slice(0, 3).map((item) => (
                      <ItemChip
                        key={item.id}
                        item={item}
                        onOpen={() => openItem(item)}
                        draggable={item.kind === "task" && !item.ghost}
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="px-1.5 font-mono text-[10.5px] text-ink-faint">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((date) => {
            const items = buckets.get(date) ?? [];
            const isToday = date === today;
            return (
              <div
                key={date}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropTask(date)}
                className={`surface min-h-40 rounded-xl p-2.5 ${isToday ? "ring-1 ring-(--accent)/40" : ""}`}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="eyebrow">{WEEKDAYS[(parseISO(date).getDay() + 6) % 7]}</span>
                  <span
                    className={`tnum font-mono text-[12px] ${isToday ? "text-accent" : "text-ink-faint"}`}
                  >
                    {parseISO(date).getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <ItemChip
                      key={item.id}
                      item={item}
                      onOpen={() => openItem(item)}
                      draggable={item.kind === "task" && !item.ghost}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "agenda" && (
        <div className="flex flex-col gap-2.5">
          {days.map((date) => {
            const items = buckets.get(date) ?? [];
            if (items.length === 0) return null;
            const d = parseISO(date);
            return (
              <section key={date} className="surface rounded-xl p-3.5">
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className={`tnum font-mono text-[12px] ${date === today ? "text-accent" : "text-ink-faint"}`}>
                    {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <ItemChip
                      key={item.id}
                      item={item}
                      onOpen={() => openItem(item)}
                      draggable={false}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {view !== "agenda" && (
        <section className="surface rounded-2xl p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="eyebrow">
              {parseISO(selected).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>
          <div className="flex flex-col gap-1">
            {selectedItems.map((item) => (
              <ItemChip key={item.id} item={item} onOpen={() => openItem(item)} draggable={false} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void quickAdd();
                }
              }}
              aria-label="Add for this day"
              placeholder="Add"
              className="h-10 flex-1 rounded-xl border border-line bg-bg1 px-3.5 text-[14px] text-ink placeholder:text-ink-faint transition-colors duration-[var(--dur-base)] hover:border-line-strong focus:border-(--accent)/50 focus:outline-none"
            />
            <Button variant="secondary" onClick={quickAdd} loading={create.isPending}>
              Add
            </Button>
          </div>
        </section>
      )}

      <TaskEditModal
        task={editing}
        statuses={["todo", "doing", "done"]}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
