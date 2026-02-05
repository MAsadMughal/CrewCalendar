"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Edit } from "lucide-react";
import type { Employee } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface EmployeePillBarProps {
  employees: Employee[];
}

export function EmployeePillBar({ employees }: EmployeePillBarProps) {
  const { selectedEmployeeFilters, toggleEmployeeFilter, openEmployeeModal } = useUIStore();

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">Employees:</span>
        {employees.length === 0 ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">No employees yet</span>
        ) : (
          employees.map((employee) => (
            <EmployeePill
              key={employee.id}
              employee={employee}
              isFiltered={selectedEmployeeFilters.includes(employee.id)}
              onFilterToggle={() => toggleEmployeeFilter(employee.id)}
              onEdit={() => openEmployeeModal(employee.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface EmployeePillProps {
  employee: Employee;
  isFiltered: boolean;
  onFilterToggle: () => void;
  onEdit: () => void;
}

const EmployeePill = memo(function EmployeePill({ employee, isFiltered, onFilterToggle, onEdit }: EmployeePillProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id,
    data: { type: "employee", employee },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: employee.teamColor,
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-sm font-medium shrink-0",
        "hover:opacity-90 transition-opacity select-none group",
        isDragging && "opacity-50 cursor-grabbing shadow-lg",
        isFiltered && "ring-2 ring-offset-2 ring-gray-800"
      )}
    >
      <span
        {...listeners}
        {...attributes}
        onClick={onFilterToggle}
        className="cursor-grab max-w-[100px] truncate"
        title={employee.name}
      >
        {employee.name}
      </span>
      <button
        onClick={handleEditClick}
        className="opacity-60 hover:opacity-100 transition-opacity ml-1"
        title="Edit employee"
      >
        <Edit className="h-3 w-3" />
      </button>
    </div>
  );
});
