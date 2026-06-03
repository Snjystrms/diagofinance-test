"use client";

import { useState, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SearchSelectOption = {
  id: string | number;
  name: string;
  email?: string;
  description?: string;
};

interface SearchSelectFieldEnhancedProps<T extends SearchSelectOption> {
  id: string;
  label: string;
  placeholder?: string;
  searchValue: string;
  selectedValue?: string | number;
  options: T[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  idleMessage?: string;
  minimumSearchLength?: number;
  onSearchValueChange: (value: string) => void;
  onOptionSelect: (option: T) => void;
  onClear?: () => void;
  getOptionValue: (option: T) => string;
  getOptionLabel: (option: T) => string;
  getOptionDescription?: (option: T) => string;
  renderOption?: (option: T) => React.ReactNode;
}

export function SearchSelectFieldEnhanced<T extends SearchSelectOption>({
  id,
  label,
  placeholder = "Start typing to search...",
  searchValue,
  selectedValue,
  options,
  loading = false,
  disabled = false,
  className,
  helperText,
  errorText,
  required = false,
  loadingMessage = "Searching...",
  emptyMessage = "No results found",
  idleMessage = "Start typing to search",
  minimumSearchLength = 3,
  onSearchValueChange,
  onOptionSelect,
  onClear,
  getOptionValue,
  getOptionLabel,
  getOptionDescription,
  renderOption,
}: SearchSelectFieldEnhancedProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onSearchValueChange(value);
      setIsOpen(value.length >= minimumSearchLength || options.length > 0);
    },
    [onSearchValueChange, minimumSearchLength, options.length]
  );

  const handleOptionClick = useCallback(
    (option: T) => {
      onOptionSelect(option);
      setIsOpen(false);
    },
    [onOptionSelect]
  );

  const handleClear = useCallback(() => {
    onSearchValueChange("");
    onClear?.();
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSearchValueChange, onClear]);

  const showDropdown = isOpen && (searchValue.length >= minimumSearchLength || options.length > 0);
  const showMinimumLengthMessage = searchValue.length > 0 && searchValue.length < minimumSearchLength;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              id={id}
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(searchValue.length >= minimumSearchLength || options.length > 0)}
              onBlur={(e) => {
                // Delay hiding to allow option clicks
                setTimeout(() => {
                  if (!dropdownRef.current?.contains(document.activeElement)) {
                    setIsOpen(false);
                  }
                }, 150);
              }}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "pl-10 pr-10",
                errorText && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {searchValue && !loading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {helperText && !errorText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
        {errorText && <p className="text-xs text-destructive">{errorText}</p>}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingMessage}
            </div>
          )}

          {!loading && showMinimumLengthMessage && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Type at least {minimumSearchLength} characters to search
            </div>
          )}

          {!loading && !showMinimumLengthMessage && searchValue.length >= minimumSearchLength && options.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}

          {!loading && !showMinimumLengthMessage && searchValue.length === 0 && options.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {idleMessage}
            </div>
          )}

          {!loading && options.map((option) => {
            const isSelected = selectedValue !== undefined && getOptionValue(option) === String(selectedValue);

            return (
              <div
                key={getOptionValue(option)}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleOptionClick(option);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  handleOptionClick(option);
                }}
                className={cn(
                  "cursor-pointer rounded px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                {renderOption ? (
                  renderOption(option)
                ) : (
                  <div>
                    <div className="font-medium">{getOptionLabel(option)}</div>
                    {getOptionDescription && (
                      <div className="text-xs text-muted-foreground">
                        {getOptionDescription(option)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}