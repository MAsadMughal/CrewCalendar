"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DraggableDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  draggable?: boolean;
}

const DraggableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DraggableDialogContentProps
>(({ className, children, draggable = true, ...props }, ref) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
      };
      e.preventDefault();
    }
  }, [position]);

  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (dragRef.current) {
          const deltaX = e.clientX - dragRef.current.startX;
          const deltaY = e.clientY - dragRef.current.startY;
          setPosition({
            x: dragRef.current.startPosX + deltaX,
            y: dragRef.current.startPosY + deltaY,
          });
        }
      };
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        dragRef.current = null;
      };
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onMouseDown={draggable ? handleMouseDown : undefined}
        style={{
          transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
        }}
        className={cn(
          "fixed left-[50%] top-4 z-50 flex flex-col w-[95vw] sm:w-[80vw] lg:w-[35vw] lg:min-w-[500px] border bg-background shadow-xl sm:rounded-lg max-h-[calc(100vh-2rem)]",
          isDragging ? "cursor-grabbing select-none" : "",
          className
        )}
        {...props}
      >
        <div className="drag-handle flex items-center justify-center py-2.5 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-200 cursor-grab active:cursor-grabbing rounded-t-lg shadow-sm">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 rounded-full bg-slate-300" />
            <div className="w-2 h-1 rounded-full bg-slate-300" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        <DialogPrimitive.Close className="absolute right-3 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
          <X className="h-4 w-4 text-gray-500" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DraggableDialogContent.displayName = "DraggableDialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight flex items-center gap-2",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DraggableDialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
