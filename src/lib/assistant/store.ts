"use client";

import { create } from "zustand";

interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAssistant = create<AssistantState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
