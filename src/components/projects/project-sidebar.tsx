"use client";

import { useState, memo, useMemo, useRef, useCallback, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Edit, Trash2, User, Plus, Filter, Check, X, Users, FolderKanban, Calendar, ChevronsUpDown, Eye, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Project, Employee, Booking } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useDeleteBookingsForEmployee, useDeleteBookingsForProject } from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Input } from "@/components/ui/input";
import { useStatsStore } from "@/stores/stats-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectSidebarProps {
  projects: Project[];
  employees: Employee[];
  bookings: Booking[];
}

const ROW_HEIGHT = 32;
const EMPLOYEE_ROW_HEIGHT = 24;
const NAV_HEIGHT = 0;
const MONTH_ROW_HEIGHT = 20;
const WEEK_ROW_HEIGHT = 20;
// DATE_HEADER_HEIGHT is computed dynamically based on stats visibility


export function ProjectSidebar({ projects, employees, bookings }: ProjectSidebarProps) {
  const { selectedEmployeeFilters, toggleEmployeeFilter, setSelectedEmployeeFilters, openEmployeeModal, openProjectModal, openHolidayModal, expandedProjects, setExpandedProjects } = useUIStore();
  const { isStatsVisible, toggleStats } = useStatsStore();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  // Dynamic height based on stats visibility - reduced to save more space
  const DATE_HEADER_HEIGHT = isStatsVisible ? 75 : 35;
  const TOTAL_HEADER_HEIGHT = NAV_HEIGHT + MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT + DATE_HEADER_HEIGHT;

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterModalPosition, setFilterModalPosition] = useState({ x: 260, y: 80 });
  const filterModalRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { activeProjects, deliveredProjects } = useMemo(() => ({
    activeProjects: projects.filter(p => p.status === "active"),
    deliveredProjects: projects.filter(p => p.status === "delivered"),
  }), [projects]);

  const filteredActiveProjects = useMemo(() =>
    selectedEmployeeFilters.length === 0
      ? activeProjects
      : activeProjects.filter(project =>
        (project.assignedEmployees || []).some(empId =>
          selectedEmployeeFilters.includes(empId)
        )
      ),
    [activeProjects, selectedEmployeeFilters]
  );

  const hasActiveFilter = selectedEmployeeFilters.length > 0;
  const activeProjectIds = useMemo(() => activeProjects.map(p => p.id), [activeProjects]);

  const allProjectsExpanded = activeProjectIds.length > 0 && activeProjectIds.every(id => expandedProjects.includes(id));

  const handleToggleAll = () => {
    if (allProjectsExpanded) {
      setExpandedProjects([]);
    } else {
      setExpandedProjects(activeProjectIds);
    }
  };

  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      e.name.toLowerCase().includes(filterSearch.toLowerCase())
    ),
    [employees, filterSearch]
  );

  const handleFilterModalDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - filterModalPosition.x,
      y: clientY - filterModalPosition.y,
    };
  }, [filterModalPosition]);

  const handleFilterModalDrag = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setFilterModalPosition({
      x: Math.max(0, clientX - dragOffset.current.x),
      y: Math.max(0, clientY - dragOffset.current.y),
    });
  }, []);

  const handleFilterModalDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleFilterModalDrag);
    document.removeEventListener('mouseup', handleFilterModalDragEnd);
    document.removeEventListener('touchmove', handleFilterModalDrag);
    document.removeEventListener('touchend', handleFilterModalDragEnd);
  }, [handleFilterModalDrag]);

  const startFilterModalDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    handleFilterModalDragStart(e);
    document.addEventListener('mousemove', handleFilterModalDrag);
    document.addEventListener('mouseup', handleFilterModalDragEnd);
    document.addEventListener('touchmove', handleFilterModalDrag);
    document.addEventListener('touchend', handleFilterModalDragEnd);
  }, [handleFilterModalDragStart, handleFilterModalDrag, handleFilterModalDragEnd]);

  return (
    <div className="w-[250px] min-w-[250px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col sticky left-0 z-40">
      <div
        className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-50"
        style={{ height: TOTAL_HEADER_HEIGHT }}
      >

        <div
          className="flex items-center justify-center border-b border-gray-100 px-2"
          style={{ height: MONTH_ROW_HEIGHT }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterModalOpen(true)}
            className={cn(
              "h-5 text-[10px] gap-1 px-2 w-full justify-between",
              hasActiveFilter && "bg-blue-100 text-blue-700 hover:bg-blue-200"
            )}
          >
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              <span>{hasActiveFilter ? `${selectedEmployeeFilters.length} ${tCommon("selected")}` : tCommon("allEmployees")}</span>
              <span className="text-gray-400 font-normal">({activeProjects.length})</span>
            </div>
            {hasActiveFilter && (
              <X
                className="h-3 w-3 cursor-pointer hover:bg-blue-300 rounded-full p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmployeeFilters([]);
                }}
              />
            )}
          </Button>
        </div>

        <div
          className="flex items-center border-b border-gray-100 px-1 gap-1"
          style={{ height: WEEK_ROW_HEIGHT }}
        >
          <div className="flex gap-1 flex-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEmployeeModal()}
              className="h-4 flex-1 text-[9px] gap-1 px-0 font-medium border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Plus className="h-2.5 w-2.5" />
              {t("employee")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openProjectModal()}
              className="h-4 flex-1 text-[9px] gap-1 px-0 font-medium border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Plus className="h-2.5 w-2.5" />
              {t("project")}
            </Button>
          </div>
          {hasActiveFilter && (
            <span className="text-[8px] text-gray-400 shrink-0 px-1 border-l border-gray-100">
              {filteredActiveProjects.length}/{activeProjects.length}
            </span>
          )}
        </div>

        <div
          className="flex flex-col justify-center px-2 py-1"
          style={{ height: DATE_HEADER_HEIGHT }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("projects")} ({filteredActiveProjects.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleStats}
                className={cn(
                  "h-5 px-1.5 text-[10px] gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded",
                  isStatsVisible ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400"
                )}
                title={isStatsVisible ? "Hide Stats (B:A:U:)" : "Show Stats (B:A:U:)"}
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold">B:A:U:</span>
                  {isStatsVisible ? <Eye className="h-3 w-3" /> : <Eye className="h-3 w-3 opacity-50" />}
                </div>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleAll}
              className="h-5 px-1 text-[10px] gap-0.5"
              title={allProjectsExpanded ? t("collapseAll") : t("expandAll")}
            >
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      <div>
        {filteredActiveProjects.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
            {hasActiveFilter ? t("noProjectsMatchFilter") : t("noProjects")}
          </div>
        ) : (
          filteredActiveProjects.map((project) => (
            <SortableProject
              key={project.id}
              project={project}
              employees={employees}
              bookings={bookings}
            />
          ))
        )}

        {deliveredProjects.length > 0 && (
          <>
            <div className="px-2 py-1.5 bg-gray-100 border-y border-gray-200">
              <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {t("delivered")} ({deliveredProjects.length})
              </h3>
            </div>
            {deliveredProjects.map((project) => (
              <DeliveredProject
                key={project.id}
                project={project}
                employees={employees}
              />
            ))}
          </>
        )}
      </div>

      {filterModalOpen && (
        <TooltipProvider>
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
            onClick={() => setFilterModalOpen(false)}
          />
          <div
            ref={filterModalRef}
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50 w-[300px] max-h-[400px] flex flex-col"
            style={{
              left: filterModalPosition.x,
              top: filterModalPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg cursor-move select-none"
              onMouseDown={startFilterModalDrag}
              onTouchStart={startFilterModalDrag}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("filterEmployees")}</span>
              </div>
              <div className="flex items-center gap-1">
                {hasActiveFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2"
                    onClick={() => setSelectedEmployeeFilters([])}
                  >
                    {tCommon("clear")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setFilterModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-2 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder={t("searchEmployees")}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="h-8 text-xs pl-7"
                />
              </div>
            </div>

            {selectedEmployeeFilters.length > 0 && (
              <div className="p-2 border-b dark:border-gray-700 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">{tCommon("selected")} ({selectedEmployeeFilters.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployeeFilters.map((empId) => {
                    const employee = employees.find(e => e.id === empId);
                    if (!employee) return null;
                    return (
                      <Tooltip key={empId}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleEmployeeFilter(empId)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors bg-white dark:bg-gray-800 border shadow-sm hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-800"
                            style={{ borderColor: employee.teamColor }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: employee.teamColor }}
                            />
                            <span className="max-w-[80px] truncate dark:text-gray-200">{employee.name}</span>
                            <X className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {t("clickToRemove")} {employee.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="f                  {filex-1 overflow-y-auto p-2 space-y-1">
              {filteredEmployees.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
                  {filterSearch ? t("noEmployeesMatchSearch") : t("noEmployees")}
                </div>
              ) : (
                filteredEmployees.map((employee) => {
                  const isSelected = selectedEmployeeFilters.includes(employee.id);
                  return (
                    <Tooltip key={employee.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleEmployeeFilter(employee.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          )}
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0 border-2"
                            style={{
                              backgroundColor: isSelected ? employee.teamColor : "transparent",
                              borderColor: employee.teamColor
                            }}
                          />
                          <span className="flex-1 text-left truncate">{employee.name}</span>
                          {isSelected && <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {isSelected ? t("clickToRemove") : t("clickToAdd")} {employee.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

interface SortableProjectProps {
  project: Project;
  employees: Employee[];
  bookings: Booking[];
}

const SortableProject = memo(function SortableProject({ project, employees, bookings }: SortableProjectProps) {
  const { expandedProjects, toggleProjectExpanded, openProjectModal } = useUIStore();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const deleteBookingsForEmployee = useDeleteBookingsForEmployee();
  const deleteBookingsForProject = useDeleteBookingsForProject();
  const t = useTranslations("sidebar");
  const tConfirm = useTranslations("confirmModal");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState<{ employeeId: string; employeeName: string } | null>(null);

  const isExpanded = expandedProjects.includes(project.id);

  const assignedEmployees = useMemo(() =>
    employees.filter(e => (project.assignedEmployees || []).includes(e.id)),
    [employees, project.assignedEmployees]
  );

  const projectBookings = useMemo(() =>
    bookings.filter(b => b.projectId === project.id),
    [bookings, project.id]
  );

  const getEmployeeBookingCount = (employeeId: string) =>
    projectBookings.filter(b => b.employeeId === employeeId).length;

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: "project", project },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${project.id}`,
    data: { type: "project-drop", projectId: project.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRemoveEmployee = (employeeId: string) => {
    deleteBookingsForEmployee.mutate(
      { projectId: project.id, employeeId },
      {
        onSuccess: () => {
          updateProject.mutate({
            id: project.id,
            assignedEmployees: (project.assignedEmployees || []).filter(id => id !== employeeId),
          });
          setConfirmUnassign(null);
        },
        onError: () => {
          setConfirmUnassign(null);
        },
      }
    );
  };

  const handleDeleteProject = () => {
    deleteBookingsForProject.mutate(project.id, {
      onSuccess: () => {
        deleteProject.mutate(project.id);
        setConfirmDelete(false);
      },
      onError: () => {
        setConfirmDelete(false);
      },
    });
  };

  return (
    <>
      <div
        ref={setSortableRef}
        style={style}
        className={cn(
          "bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-all duration-200",
          isDragging && "opacity-20 bg-gray-50 dark:bg-gray-900 border-dashed border-2 border-primary/30"
        )}
      >
        <div
          ref={setDropRef}
          className={cn(
            "flex items-center gap-1 px-2 transition-colors relative group/row",
            isOver && "bg-blue-50 dark:bg-blue-900/30"
          )}
          style={{ height: ROW_HEIGHT }}
        >
          {/* Drop Indicator Line (top) */}
          {isOver && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
          )}

          <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <GripVertical className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </button>

          <button onClick={() => toggleProjectExpanded(project.id)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-1">
            <span className="font-medium text-xs text-gray-800 dark:text-gray-200 truncate">
              {project.name}
            </span>
            <span className={cn(
              "text-[10px] px-1 py-0.5 rounded shrink-0",
              project.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            )}>
              {project.status}
            </span>
            {isOver && !isDragging && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium animate-pulse ml-auto">
                {t("dropHere")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              onClick={() => openProjectModal(project.id)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Drop Indicator Line (bottom) */}
          {isOver && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />
          )}
        </div>

        {isExpanded && !isDragging && assignedEmployees.map((employee) => {
          const bookingCount = getEmployeeBookingCount(employee.id);
          return (
            <div
              key={employee.id}
              className="flex items-center gap-2 px-2 pl-8 group/emp"
              style={{ height: EMPLOYEE_ROW_HEIGHT }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: employee.teamColor }}
              />
              <User className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 shrink-0" />
              <span className="text-[11px] text-gray-700 dark:text-gray-300 flex-1 truncate max-w-[100px]" title={employee.name}>{employee.name}</span>
              {bookingCount > 0 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0">
                  {bookingCount} {t("bookings")}
                </span>
              )}
              <button
                onClick={() => setConfirmUnassign({ employeeId: employee.id, employeeName: employee.name })}
                className="opacity-0 group-hover/emp:opacity-100 text-red-400 hover:text-red-600 shrink-0 transition-opacity"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}

        {isExpanded && !isDragging && assignedEmployees.length === 0 && (
          <div
            className={cn(
              "text-[10px] text-gray-400 dark:text-gray-500 px-2 pl-8 italic flex items-center gap-1",
              isOver && "text-blue-600 dark:text-blue-400 font-medium"
            )}
            style={{ height: EMPLOYEE_ROW_HEIGHT, lineHeight: `${EMPLOYEE_ROW_HEIGHT}px` }}
          >
            <Plus className="h-2.5 w-2.5" />
            {t("dragEmployeesToAssign")}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteProject}
        title={tConfirm("deleteProject")}
        description={projectBookings.length === 1
          ? tConfirm("deleteProjectDescription", { name: project.name, count: projectBookings.length })
          : tConfirm("deleteProjectDescriptionPlural", { name: project.name, count: projectBookings.length })}
        confirmText={tConfirm("deleteProject")}
        isLoading={deleteBookingsForProject.isPending || deleteProject.isPending}
      />

      {confirmUnassign && (
        <ConfirmModal
          open={true}
          onClose={() => setConfirmUnassign(null)}
          onConfirm={() => handleRemoveEmployee(confirmUnassign.employeeId)}
          title={tConfirm("unassignEmployee")}
          description={getEmployeeBookingCount(confirmUnassign.employeeId) === 1
            ? tConfirm("unassignEmployeeDescription", {
              employeeName: confirmUnassign.employeeName,
              projectName: project.name,
              count: getEmployeeBookingCount(confirmUnassign.employeeId)
            })
            : tConfirm("unassignEmployeeDescriptionPlural", {
              employeeName: confirmUnassign.employeeName,
              projectName: project.name,
              count: getEmployeeBookingCount(confirmUnassign.employeeId)
            })}
          confirmText={tConfirm("unassignEmployee")}
          variant="warning"
          isLoading={deleteBookingsForEmployee.isPending}
        />
      )}
    </>
  );
});

interface DeliveredProjectProps {
  project: Project;
  employees: Employee[];
}

const DeliveredProject = memo(function DeliveredProject({ project, employees }: DeliveredProjectProps) {
  const { openProjectModal } = useUIStore();

  const assignedEmployees = useMemo(() =>
    employees.filter(e => (project.assignedEmployees || []).includes(e.id)),
    [employees, project.assignedEmployees]
  );

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div
        className="flex items-center gap-1 px-2"
        style={{ height: ROW_HEIGHT }}
      >
        <div className="w-4" />

        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span className="font-medium text-xs text-gray-500 truncate">
            {project.name}
          </span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-gray-200 text-gray-500 shrink-0">
            {project.status}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={() => openProjectModal(project.id)}
        >
          <Edit className="h-2.5 w-2.5 text-gray-400" />
        </Button>
      </div>
    </div>
  );
});
