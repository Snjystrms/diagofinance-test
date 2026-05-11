"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type SearchSelectFieldProps<T> = {
  id: string;
  label: string;
  options: T[];
  searchValue: string;
  selectedValue?: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  idleMessage?: string;
  emptyMessage?: string;
  helperText?: React.ReactNode;
  className?: string;
  onSearchValueChange: (value: string) => void;
  onOptionSelect: (option: T) => void;
  getOptionValue: (option: T) => string;
  getOptionLabel: (option: T) => string;
  getOptionDescription?: (option: T) => string | null | undefined;
};

export function SearchSelectField<T>({
  id,
  label,
  options,
  searchValue,
  selectedValue,
  placeholder,
  disabled = false,
  loading = false,
  loadingMessage = "Loading...",
  idleMessage = "Start typing to search.",
  emptyMessage = "No results found.",
  helperText,
  className,
  onSearchValueChange,
  onOptionSelect,
  getOptionValue,
  getOptionLabel,
  getOptionDescription,
}: SearchSelectFieldProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const showDropdown = isOpen && !disabled;
  const hasSearch = searchValue.trim().length > 0;

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={searchValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          className="pl-9 pr-9"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setIsOpen(true);
            onSearchValueChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
          {loading ? <Spinner className="h-4 w-4" size="sm" /> : <ChevronsUpDown className="h-4 w-4 opacity-60" />}
        </div>

        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-50 mt-2 max-h-64 w-full overflow-hidden rounded-xl border border-border/60 bg-popover shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" size="sm" />
                <span>{loadingMessage}</span>
              </div>
            ) : options.length > 0 ? (
              <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
                {options.map((option) => {
                  const optionValue = getOptionValue(option);
                  const optionLabel = getOptionLabel(option);
                  const optionDescription = getOptionDescription?.(option);
                  const isSelected = selectedValue === optionValue;

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                        isSelected && "bg-muted/40"
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onOptionSelect(option);
                        setIsOpen(false);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{optionLabel}</p>
                        {optionDescription ? (
                          <p className="truncate text-xs text-muted-foreground">{optionDescription}</p>
                        ) : null}
                      </div>
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 text-primary",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                {hasSearch ? emptyMessage : idleMessage}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {helperText ? <div className="text-xs text-muted-foreground">{helperText}</div> : null}
    </div>
  );
}
