import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StatsStore {
    isStatsVisible: boolean;
    toggleStats: () => void;
    setStatsVisible: (visible: boolean) => void;
}

export const useStatsStore = create<StatsStore>()(
    persist(
        (set) => ({
            isStatsVisible: false,
            toggleStats: () => set((state) => ({ isStatsVisible: !state.isStatsVisible })),
            setStatsVisible: (visible) => set({ isStatsVisible: visible }),
        }),
        {
            name: "stats-storage",
        }
    )
);
