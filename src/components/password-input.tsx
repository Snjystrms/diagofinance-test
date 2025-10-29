// src/components/password-input.tsx
"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"; // if you don't have cn, replace with a simple join

type Props = Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
  className?: string;      // wrapper
  inputClassName?: string; // inner input
};

export function PasswordInput({ className, inputClassName, ...props }: Props) {
  const [show, setShow] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-10", inputClassName)}
        autoComplete={props.autoComplete ?? "new-password"}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        onMouseDown={(e) => e.preventDefault()} // keep focus in input
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}