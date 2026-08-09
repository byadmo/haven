"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// ── Overlay ──────────────────────────────────────────────────────────
// Framer Motion-powered backdrop with blur + opacity fade. Mounts via
// AnimatePresence so exit animations fire on unmount.
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const reduceMotion = useReducedMotion()
  return (
    <DialogPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/80", className)}
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
      />
    </DialogPrimitive.Overlay>
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Advance an explicitly-marked primary action ([data-next] or
// [data-primary-action]) when Enter/Space is pressed outside any text input.
function dialogHandleKeyDown(e) {
  if (e.key !== "Enter" && e.key !== " ") return
  const tgt = e.target
  const tag = tgt?.tagName?.toLowerCase?.()
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" ||
      tgt?.isContentEditable) return
  const marked = e.currentTarget.querySelector(
    "[data-next]:not([disabled]), [data-primary-action]:not([disabled])"
  )
  if (marked) { e.preventDefault(); marked.click() }
}

// ── Content ──────────────────────────────────────────────────────────
// Spring-based scale + opacity entrance. Static centering via Framer
// Motion's style props (GPU-composited, never layout-affecting).
// Falls back to opacity-only fade when prefers-reduced-motion is active.
const DialogContent = React.forwardRef(({ className, children, onKeyDown, ...props }, ref) => {
  const reduceMotion = useReducedMotion()

  return (
    <DialogPortal>
      <AnimatePresence>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          onKeyDown={(e) => { dialogHandleKeyDown(e); onKeyDown?.(e) }}
          asChild
          {...props}
        >
          <motion.div
            className={cn(
              "fixed left-1/2 top-1/2 z-50",
              "grid w-full max-w-lg gap-4",
              "border border-white/10 bg-background text-foreground p-4 sm:p-6",
              "shadow-lg sm:rounded-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden",
              className
            )}
            style={{ x: "-50%", y: "-50%" }}
            initial={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96, x: "-50%", y: "-44%" }
            }
            animate={reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, x: "-50%", y: "-50%" }
            }
            exit={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.98, x: "-50%", y: "-48%" }
            }
            transition={reduceMotion
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }
            }
          >
            {children}
          </motion.div>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </DialogPortal>
  )
})
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