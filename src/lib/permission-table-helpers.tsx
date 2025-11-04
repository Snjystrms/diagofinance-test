'use client';

import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionAwareButton, PermissionGate } from '@/components/permission-aware-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from './permissions';

export interface TableActionHandlers<T> {
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onCustomAction?: (item: T, actionKey: string) => void;
}

export interface CustomAction {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  variant?: 'default' | 'destructive' | 'ghost' | 'link' | 'outline' | 'secondary';
  requiredAction?: string; // defaults to 'write'
}

export interface PermissionAwareActionsColumnProps<T> {
  requiredModule: string;
  handlers: TableActionHandlers<T>;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  customActions?: CustomAction[];
  compact?: boolean; // Use dropdown menu for space-saving
}

/** Creates a permission-aware actions column for data tables */
export function createPermissionAwareActionsColumn<
  T extends { id: string | number }
>({
  requiredModule,
  handlers,
  showView = true,
  showEdit = true,
  showDelete = true,
  customActions = [],
  compact = false,
}: PermissionAwareActionsColumnProps<T>): ColumnDef<T> {
  return {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const item = row.original;

      if (compact) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showView && handlers.onView && (
                <DropdownMenuItem onClick={() => handlers.onView?.(item)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}

              {showEdit && handlers.onEdit && (
                <PermissionGate requiredModule={requiredModule} requiredAction="write">
                  <DropdownMenuItem onClick={() => handlers.onEdit?.(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </PermissionGate>
              )}

              {customActions.map((action) => (
                <PermissionGate
                  key={action.key}
                  requiredModule={requiredModule}
                  requiredAction={action.requiredAction || 'write'}
                >
                  <DropdownMenuItem onClick={() => handlers.onCustomAction?.(item, action.key)}>
                    {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                </PermissionGate>
              ))}

              {showDelete && handlers.onDelete && (
                <PermissionGate requiredModule={requiredModule} requiredAction="write">
                  <DropdownMenuItem
                    onClick={() => handlers.onDelete?.(item)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </PermissionGate>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      return (
        <div className="flex items-center gap-2">
          {showView && handlers.onView && (
            <Button variant="ghost" size="icon" onClick={() => handlers.onView?.(item)}>
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {showEdit && handlers.onEdit && (
            <PermissionGate requiredModule={requiredModule} requiredAction="write">
              <Button variant="ghost" size="icon" onClick={() => handlers.onEdit?.(item)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGate>
          )}

          {customActions.map((action) => (
            <PermissionGate
              key={action.key}
              requiredModule={requiredModule}
              requiredAction={action.requiredAction || 'write'}
            >
              <Button
                variant={action.variant || 'ghost'}
                size="icon"
                onClick={() => handlers.onCustomAction?.(item, action.key)}
              >
                {action.icon ? <action.icon className="h-4 w-4" /> : action.label}
              </Button>
            </PermissionGate>
          ))}

          {showDelete && handlers.onDelete && (
            <PermissionGate requiredModule={requiredModule} requiredAction="write">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlers.onDelete?.(item)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}

/** Helper to check if a table should be shown based on read permissions */
export function useTablePermissions(requiredModule: string) {
  const { canRead, canWrite } = usePermissions();

  return {
    canView: canRead(requiredModule),
    canModify: canWrite(requiredModule),
    renderAccessDenied: (title: string) => (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don&apos;t have permission to view {title.toLowerCase()}.
        </p>
      </div>
    ),
  };
}
