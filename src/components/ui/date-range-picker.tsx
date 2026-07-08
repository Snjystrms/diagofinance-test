"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  onFromDateChange: (date: Date | undefined) => void;
  onToDateChange: (date: Date | undefined) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  fromLabel = "From Date",
  toLabel = "To Date",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);

  const handleFromDateSelect = (date: Date | undefined) => {
    onFromDateChange(date);
    setFromOpen(false);
  };

  const handleToDateSelect = (date: Date | undefined) => {
    onToDateChange(date);
    setToOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {fromLabel}
        </Label>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full h-9 justify-start text-left font-normal",
                !fromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {fromDate ? (
                format(fromDate, "MMM dd, yyyy")
              ) : (
                <span>Select date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={handleFromDateSelect}
              defaultMonth={fromDate}
              initialFocus
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {toLabel}
        </Label>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full h-9 justify-start text-left font-normal",
                !toDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {toDate ? (
                format(toDate, "MMM dd, yyyy")
              ) : (
                <span>Select date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={handleToDateSelect}
              defaultMonth={toDate}
              initialFocus
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
