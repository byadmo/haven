"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

// ── Overlay — Framer Motion blur + opacity fade ──────────────────────
const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const reduceMotion = useReducedMotion()
  return (
    <DrawerPrimitive.Overlay ref={ref} asChild {...props}>
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/80", className)}
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
      />
    </DrawerPrimitive.Overlay>
  )
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

// ── Content — Vaul handles drag physics; we add the spring entrance ──
const DrawerContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const reduceMotion = useReducedMotion()

  return (
    <DrawerPortal>
      <AnimatePresence>
        <DrawerOverlay />
        <DrawerPrimitive.Content
          ref={ref}
          asChild
          {...props}
        >
          <motion.div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
              className
            )}
            initial={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: "100%" }
            }
            animate={reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0 }
            }
            exit={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: "100%" }
            }
            transition={reduceMotion
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 350, damping: 35, mass: 0.9 }
            }
          >
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
            {children}
          </motion.div>
        </DrawerPrimitive.Content>
      </AnimatePresence>
    </DrawerPortal>
  )
})
DrawerContent.displayName = DrawerPrimitive.Content.displayName

const DrawerHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props} />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}