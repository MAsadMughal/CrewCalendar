"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const t = useTranslations("common");
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={variant === "danger" ? "h-5 w-5 text-red-500" : "h-5 w-5 text-yellow-500"} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText || t("cancel")}
          </Button>
          <Button 
            type="button" 
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("processing") : (confirmText || t("confirm"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
