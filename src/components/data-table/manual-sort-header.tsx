"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ManualSortHeaderProps {
  sortKey: string;
  title: string;
  className?: string;
}

export function ManualSortHeader({ sortKey, title, className }: ManualSortHeaderProps) {
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);

  const isActive = sortBy === sortKey;
  const currentSortOrder = isActive ? sortOrder : null;

  const handleSort = async (order: "asc" | "desc") => {
    await setSortBy(sortKey);
    await setSortOrder(order);
  };

  const handleClearSort = async () => {
    await setSortBy(null);
    await setSortOrder(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
          className,
        )}
      >
        {title}
        {isActive && currentSortOrder === "desc" ? (
          <ChevronDown />
        ) : isActive && currentSortOrder === "asc" ? (
          <ChevronUp />
        ) : (
          <ChevronsUpDown />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28">
        <DropdownMenuCheckboxItem
          className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
          checked={isActive && currentSortOrder === "asc"}
          onClick={() => void handleSort("asc")}
        >
          <ChevronUp />
          Asc
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
          checked={isActive && currentSortOrder === "desc"}
          onClick={() => void handleSort("desc")}
        >
          <ChevronDown />
          Desc
        </DropdownMenuCheckboxItem>
        {isActive && (
          <DropdownMenuCheckboxItem
            className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
            checked={false}
            onClick={() => void handleClearSort()}
          >
            <ChevronsUpDown />
            Clear
          </DropdownMenuCheckboxItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
