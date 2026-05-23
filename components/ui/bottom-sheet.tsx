"use client"

import * as React from "react"
import { Drawer } from "vaul"
import { cn } from "@/lib/utils"

const BottomSheet = Drawer.Root

const BottomSheetTrigger = Drawer.Trigger

const BottomSheetClose = Drawer.Close

const BottomSheetPortal = Drawer.Portal

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof Drawer.Overlay>,
  React.ComponentPropsWithoutRef<typeof Drawer.Overlay>
>(({ className, ...props }, ref) => (
  <Drawer.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60", className)}
    {...props}
  />
))
BottomSheetOverlay.displayName = "BottomSheetOverlay"

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof Drawer.Content>,
  React.ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, children, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <Drawer.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl bg-background",
        className
      )}
      {...props}
    >
      {/* Handle bar */}
      <div className="mx-auto mt-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted-foreground/30" />
      <div className="flex-1 overflow-y-auto p-4 pb-8">{children}</div>
    </Drawer.Content>
  </BottomSheetPortal>
))
BottomSheetContent.displayName = "BottomSheetContent"

const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 py-3 text-center sm:text-left", className)}
    {...props}
  />
)
BottomSheetHeader.displayName = "BottomSheetHeader"

const BottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 pt-4", className)}
    {...props}
  />
)
BottomSheetFooter.displayName = "BottomSheetFooter"

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof Drawer.Title>,
  React.ComponentPropsWithoutRef<typeof Drawer.Title>
>(({ className, ...props }, ref) => (
  <Drawer.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
BottomSheetTitle.displayName = "BottomSheetTitle"

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof Drawer.Description>,
  React.ComponentPropsWithoutRef<typeof Drawer.Description>
>(({ className, ...props }, ref) => (
  <Drawer.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
BottomSheetDescription.displayName = "BottomSheetDescription"

export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
}
