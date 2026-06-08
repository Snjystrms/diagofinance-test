"use client";

import { useEffect, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApiSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minimumLength?: number;
  delay?: number;
  showClearButton?: boolean;
}

export function ApiSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
  disabled = false,
  minimumLength = 3,
  delay = 300,
  showClearButton = true,
}: ApiSearchBarProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback(
    (searchValue: string) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only call onSearch if we have enough characters or if clearing
      if (searchValue.length === 0 || searchValue.length >= minimumLength) {
        timeoutRef.current = setTimeout(() => {
          onSearch?.(searchValue);
        }, delay);
      }
    },
    [onSearch, minimumLength, delay]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      debouncedSearch(newValue);
    },
    [onChange, debouncedSearch]
  );

  const handleClear = useCallback(() => {
    onChange("");
    onSearch?.("");
  }, [onChange, onSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("flex w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5", className)}>
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            onSearch?.(value);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
      {showClearButton && value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}