import { toast } from "@/components/ui/use-toast";

/**
 * Show a toast with an Undo action that calls `onUndo` when clicked.
 * Returns the toast handle so callers can also dismiss it programmatically.
 */
export function useUndoToast() {
  function showUndoToast({ title, description, onUndo, duration = 6000 }) {
    return toast({
      title,
      description,
      duration,
      action: onUndo
        ? {
            onClick: () => {
              onUndo();
              toast({ title: "Undone", description: "Action was reverted.", duration: 3000 });
            },
            children: "Undo",
          }
        : undefined,
    });
  }

  return { showUndoToast };
}