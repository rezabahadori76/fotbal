import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "cta";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-background hover:bg-accent-dim font-semibold shadow-lg shadow-accent/20",
  secondary:
    "bg-card border border-card-border text-foreground hover:border-accent/50",
  ghost: "text-muted hover:text-foreground hover:bg-card",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
  cta: "bg-cta text-cta-foreground hover:bg-white font-semibold rounded-full",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
