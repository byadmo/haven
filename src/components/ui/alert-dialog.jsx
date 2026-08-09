"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

// ── Overlay ──────────────────────────────────────────────────────────
const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const reduceMotion = useReducedMotion()
  return (
    <AlertDialogPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/80", className)}
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
      />
    </AlertDialogPrimitive.Overlay>
  )
})
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

// ── Content ──────────────────────────────────────────────────────────
const AlertDialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const reduceMotion = useReducedMotion()

  return (
    <AlertDialogPortal>
      <AnimatePresence>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          ref={ref}
          asChild
          {...props}
        >
          <motion.div
            className={cn(
              "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg gap-4",
              "border bg-background p-6 shadow-lg sm:rounded-lg",
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
        </AlertDialogPrimitive.Content>
      </AnimatePresence>
    </AlertDialogPortal>
  )
})
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props} />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}