"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Advance a Dialog's primary action (Next / Finish / Complete / Confirm) when
// the user presses Enter or Space outside of a text field — so any modal that
// has a forward action is keyboard-advanceable. Buttons handle their own
// Enter/Space natively, so they're skipped; inputs/textareas are skipped so
// typing a literal space or pressing Enter inside a field isn't hijacked.
function dialogHandleKeyDown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const tgt = e.target;
  const tag = tgt?.tagName?.toLowerCase?.();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" ||
      tgt?.isContentEditable) return;
  const root = e.currentTarget;
  // Preferred: an explicitly-marked primary action.
  const marked = root.querySelector("[data-next]:not([disabled]), [data-primary-action]:not([disabled])");
  if (marked) { e.preventDefault(); marked.click(); return; }
  // Fallback: first enabled button whose caption starts with a primary word.
  const words = ["next", "finish", "complete", "continue", "confirm", "save", "ok", "apply"];
  const btns = root.querySelectorAll("button:not([disabled])");
  for (const b of btns) {
    const t = (b.textContent || "").trim().toLowerCase();
    if (words.some((w) => t.startsWith(w))) { e.preventDefault(); b.click(); return; }
  }
}

const DialogContent = React.forwardRef(({ className, children, onKeyDown, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onKeyDown={(e) => { dialogHandleKeyDown(e); onKeyDown?.(e); }}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-background text-foreground p-4 sm:p-6 shadow-lg duration-200 max-h-[90dvh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}