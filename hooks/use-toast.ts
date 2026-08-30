"use client";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
};

export function useToast() {
  function toast(options: ToastOptions) {
    window.dispatchEvent(new CustomEvent<ToastOptions>("fusionpath:toast", { detail: options }));
  }

  return { toast };
}
