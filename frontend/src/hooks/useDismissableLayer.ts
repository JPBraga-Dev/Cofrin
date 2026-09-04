import { useEffect, type RefObject } from "react";

export function useDismissableLayer<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
    };
  }, [onDismiss, open, ref]);
}
