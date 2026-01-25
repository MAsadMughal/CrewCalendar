"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface UndoAction {
  id: string;
  description: string;
  undoFn: () => Promise<void>;
}

interface AdminModeContextType {
  isAdminMode: boolean;
  targetUserId: string;
  targetUserName: string;
  undoStack: UndoAction[];
  pushUndo: (action: Omit<UndoAction, "id">) => void;
  popUndo: () => Promise<void>;
  clearUndoStack: () => void;
  isUndoing: boolean;
}

const AdminModeContext = createContext<AdminModeContextType | null>(null);

export function useAdminMode() {
  return useContext(AdminModeContext);
}

interface AdminModeProviderProps {
  targetUserId: string;
  targetUserName: string;
  children: React.ReactNode;
}

export function AdminModeProvider({
  targetUserId,
  targetUserName,
  children,
}: AdminModeProviderProps) {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  const pushUndo = useCallback((action: Omit<UndoAction, "id">) => {
    const newAction: UndoAction = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setUndoStack((prev) => [...prev, newAction]);
  }, []);

  const popUndo = useCallback(async () => {
    if (undoStack.length === 0 || isUndoing) return;
    
    setIsUndoing(true);
    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      await lastAction.undoFn();
      setUndoStack((prev) => prev.slice(0, -1));
    } catch (error) {
      console.error("Undo failed:", error);
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing]);

  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  return (
    <AdminModeContext.Provider
      value={{
        isAdminMode: true,
        targetUserId,
        targetUserName,
        undoStack,
        pushUndo,
        popUndo,
        clearUndoStack,
        isUndoing,
      }}
    >
      {children}
    </AdminModeContext.Provider>
  );
}
