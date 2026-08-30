import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-neon-blue hover:-translate-y-0.5 hover:shadow-[0_0_32px_hsl(var(--accent)/0.26)] hover:[&_svg]:translate-x-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/92",
        outline:
          "border border-border bg-card/30 text-foreground backdrop-blur-xl hover:-translate-y-0.5 hover:border-accent/45 hover:bg-primary/10 hover:text-white",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/82",
        ghost: "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
