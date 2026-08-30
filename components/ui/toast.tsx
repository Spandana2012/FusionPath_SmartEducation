"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
};

const variantStyles = {
  default: {
    icon: Info,
    className: "border-border bg-card text-card-foreground",
  },
  success: {
    icon: CheckCircle2,
    className: "border-success/30 bg-card text-card-foreground",
  },
  destructive: {
    icon: XCircle,
    className: "border-destructive/30 bg-card text-card-foreground",
  },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<Omit<ToastMessage, "id">>).detail;
      const id = Date.now();
      setToasts((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4200);
    }

    window.addEventListener("fusionpath:toast", onToast);
    return () => window.removeEventListener("fusionpath:toast", onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4 sm:right-4 sm:left-auto sm:mx-0"
    >
      {toasts.map((toast) => {
        const variant = variantStyles[toast.variant ?? "default"];
        const Icon = variant.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-soft",
              variant.className,
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium leading-5">{toast.title}</p>
              {toast.description ? <p className="text-sm leading-5 text-muted-foreground">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className="focus-ring rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss notification"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
