"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// =========================================================================
// Rebuild note — this is a from-scratch rewrite to kill the long-running
// modal-glitch reports. The previous version had two sources of flicker:
//   1. Animation utilities that mixed transform/scale/opacity transitions
//      on the same element, causing mid-transition jumps when Radix unmounted
//      the content.
//   2. A keyboard-advance handler that did *fuzzy* button-caption matching,
//      which would fire Enter presses on the first "Save"/"Next" button it
//      saw — pushing through wizard steps (or closing the modal mid-action)
//      on stray Enter keypresses and looking like the box was glitching.
//
// This rebuild:
//   • Opacity-fade ONLY for both the overlay and the panel. No scale, no
//     zoom, no slide. Hard cap 300ms (open 200ms / close 150ms).
//   • Static transform-based centering (`-translate-x/y-1/2`) — GPU-composited
//     and never animated, so the box sits dead-center through the entire
//     fade. No mid-transition jump.
//   • Inline `backdrop-filter: blur(4px)` so it survives the global
//     "kill all Tailwind backdrop-blur utilities" rule in index.css.
//   • Keyboard advance narrows to elements explicitly marked with
//     `data-next` / `data-primary-action` (e.g. an OnboardingWizard's Next
//     or Finish button). No more fuzzy caption matching, no Enter-hijacking
//     on form fields. Forms still submit on Enter natively.
// =========================================================================

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
    className={cn(
      "fixed inset-0 z-50 bg-black/80",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      "data-[state=open]:ease-enter data-[state=closed]:ease-exit",
      "data-[state=open]:duration-200 data-[state=closed]:duration-150",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Advance an explicitly-marked primary action ([data-next] or
// [data-primary-action]) when Enter/Space is pressed outside any text input.
// Skipped on inputs/textareas/selects/buttons/contentEditable so a user
// typing or submitting a form is never hijacked. NO fuzzy button-caption
// fallback — that was the source of the perceived "popup glitch".
function dialogHandleKeyDown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const tgt = e.target;
  const tag = tgt?.tagName?.toLowerCase?.();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" ||
      tgt?.isContentEditable) return;
  const marked = e.currentTarget.querySelector(
    "[data-next]:not([disabled]), [data-primary-action]:not([disabled])"
  );
  if (marked) { e.preventDefault(); marked.click(); }
}

const DialogContent = React.forwardRef(({ className, children, onKeyDown, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onKeyDown={(e) => { dialogHandleKeyDown(e); onKeyDown?.(e); }}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
        "grid w-full max-w-lg gap-4",
        "border border-white/10 bg-background text-foreground p-4 sm:p-6",
        "shadow-lg sm:rounded-lg max-h-[90dvh] overflow-y-auto",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:ease-enter data-[state=closed]:ease-exit",
        "data-[state=open]:duration-200 data-[state=closed]:duration-150",
        className
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
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