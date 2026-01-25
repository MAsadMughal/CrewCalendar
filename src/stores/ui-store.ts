import { create } from "zustand";
import { startOfDay, differenceInDays } from "date-fns";

interface UIState {
  selectedEmployeeFilters: string[];
  expandedProjects: string[];
  isEmployeeModalOpen: boolean;
  isProjectModalOpen: boolean;
  isHolidayModalOpen: boolean;
  editingEmployee: string | null;
  editingProject: string | null;
  editingHoliday: string | null;
  currentDate: Date;
  calendarOffset: number;
  viewAsUserId: string | null;
  
  setSelectedEmployeeFilters: (filters: string[]) => void;
  toggleEmployeeFilter: (employeeId: string) => void;
  toggleProjectExpanded: (projectId: string) => void;
  setExpandedProjects: (projects: string[]) => void;
  openEmployeeModal: (employeeId?: string) => void;
  closeEmployeeModal: () => void;
  openProjectModal: (projectId?: string) => void;
  closeProjectModal: () => void;
  openHolidayModal: (holidayId?: string) => void;
  closeHolidayModal: () => void;
  setCurrentDate: (date: Date) => void;
  setCalendarOffset: (offset: number) => void;
  navigateCalendar: (days: number) => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  setViewAsUserId: (userId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedEmployeeFilters: [],
  expandedProjects: [],
  isEmployeeModalOpen: false,
  isProjectModalOpen: false,
  isHolidayModalOpen: false,
  editingEmployee: null,
  editingProject: null,
  editingHoliday: null,
  currentDate: new Date(),
  calendarOffset: 0,
  viewAsUserId: null,
  
  setSelectedEmployeeFilters: (filters) => set({ selectedEmployeeFilters: filters }),
  
  toggleEmployeeFilter: (employeeId) => set((state) => ({
    selectedEmployeeFilters: state.selectedEmployeeFilters.includes(employeeId)
      ? state.selectedEmployeeFilters.filter(id => id !== employeeId)
      : [...state.selectedEmployeeFilters, employeeId]
  })),
  
  toggleProjectExpanded: (projectId) => set((state) => ({
    expandedProjects: state.expandedProjects.includes(projectId)
      ? state.expandedProjects.filter(id => id !== projectId)
      : [...state.expandedProjects, projectId]
  })),
  
  setExpandedProjects: (projects) => set({ expandedProjects: projects }),
  
  openEmployeeModal: (employeeId) => set({ 
    isEmployeeModalOpen: true, 
    editingEmployee: employeeId || null 
  }),
  
  closeEmployeeModal: () => set({ 
    isEmployeeModalOpen: false, 
    editingEmployee: null 
  }),
  
  openProjectModal: (projectId) => set({ 
    isProjectModalOpen: true, 
    editingProject: projectId || null 
  }),
  
  closeProjectModal: () => set({ 
    isProjectModalOpen: false, 
    editingProject: null 
  }),
  
  openHolidayModal: (holidayId) => set({ 
    isHolidayModalOpen: true, 
    editingHoliday: holidayId || null 
  }),
  
  closeHolidayModal: () => set({ 
    isHolidayModalOpen: false, 
    editingHoliday: null 
  }),
  
  setCurrentDate: (date) => set({ currentDate: date }),
  
  setCalendarOffset: (offset) => set({ calendarOffset: offset }),
  
  navigateCalendar: (days) => set((state) => ({ 
    calendarOffset: state.calendarOffset + days 
  })),
  
  goToToday: () => set({ calendarOffset: 0 }),
  
  goToDate: (date) => set(() => {
    const today = startOfDay(new Date());
    const targetDate = startOfDay(date);
    const offset = differenceInDays(targetDate, today);
    return { calendarOffset: offset };
  }),
  
  setViewAsUserId: (userId) => set({ viewAsUserId: userId }),
}));
