// C:\Users\DELL\Desktop\crminhouse\src\components\permission-aware-crud-table.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppDataTable } from '@/components/app-data-table';
import { DeleteDialog } from '@/components/dialogs/delete-dialog';
import { PermissionAwareButton } from '@/components/permission-aware-button';
import { usePermissions } from '@/lib/permissions';

export interface PermissionAwareCrudDataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  initialData: T[];
  formComponent: React.ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; initialData?: T | null; onSubmit: (data: Partial<T>) => void | Promise<void>; readOnly?: boolean }>;
  title: string;
  description: string;
  addButtonLabel?: string;
  requiredModule: string;
  onAdd: (newItem: Omit<T, 'id'>) => Promise<void>;
  onUpdate: (updatedItem: T) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  rowIsReadOnly?: (row: T) => boolean;
  /** ✅ NEW: allow hiding the built-in Add button so we can use an external create button */
  hideAddButton?: boolean;
  onFetchItem?: (id: string) => Promise<T>;
  onView?: (item: T) => void;
   /** Fit the table to container width instead of the default min-w-[1400px] horizontal scroll. */
  fitToWidth?: boolean;
  /**
   * Explicit capability overrides. The legacy usePermissions() helper is a
   * stub that always returns true, so manager/subadmin pages must pass these
   * from useModuleCapabilities; when omitted the legacy behaviour applies.
   */
  canEditItem?: boolean;
  canDeleteItem?: boolean;
}

export function PermissionAwareCrudDataTable<T extends { id: string }>({
  data,
  columns,
  initialData,
  formComponent: FormComponent,
  title,
  description,
  addButtonLabel = "Add New",
  requiredModule,
  onAdd,
  onUpdate,
  onDelete,
  rowIsReadOnly,
  hideAddButton = false,
  onFetchItem,
  onView,
  fitToWidth = false,
  canEditItem,
  canDeleteItem,
}: PermissionAwareCrudDataTableProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [localData] = useState<T[]>(initialData);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isFetchingItemId, setIsFetchingItemId] = useState<string | null>(null);

  const { canWrite, canRead } = usePermissions();
  const canEdit = canEditItem ?? canWrite(requiredModule);
  const canDelete = canDeleteItem ?? canWrite(requiredModule);

  const handleAdd = async (newItem: Partial<T> & { id?: string }) => {
    try {
      const { id, ...itemData } = newItem;
      await onAdd(itemData as Omit<T, 'id'>);
      setIsFormOpen(false);
      toast.success('Item added successfully');
    } catch (error) {
      toast.error('Failed to add item');
      console.error('Add error:', error);
    }
  };

  const handleUpdate = async (updatedItem: Partial<T> & { id?: string }) => {
    if (!updatedItem.id) {
      toast.error('Cannot update: ID is missing');
      return;
    }
    try {
      await onUpdate(updatedItem as T);
      setEditingItem(null);
      setIsFormOpen(false);
      toast.success('Item updated successfully');
    } catch (error) {
      toast.error('Failed to update item');
      console.error('Update error:', error);
    }
  };

  const handleEdit = async (item: T) => {
    if (onFetchItem) {
      setIsFetchingItemId(item.id);
      try {
        const freshItem = await onFetchItem(item.id);
        setEditingItem(freshItem);
        setIsFormOpen(true);
      } catch (error) {
        toast.error('Failed to load item details');
        console.error('Fetch item error:', error);
      } finally {
        setIsFetchingItemId(null);
      }
      return;
    }

    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await onDelete(itemToDelete);
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
      console.error('Delete error:', error);
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const enhancedColumns: ColumnDef<T>[] = useMemo(() => [
    ...columns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const ro = rowIsReadOnly?.(row.original) ?? false;
        const handleView = () => {
          if (onView) {
            onView(row.original);
            return;
          }
          handleEdit(row.original);
        };

        return (
          <div className="flex justify-start gap-2">
            {(onView || ro) ? (
              <Button
                variant="outline"
                size="icon"
                onClick={handleView}
                disabled={isFetchingItemId === row.original.id}
                title="View"
                className="h-8 w-8"
              >
                <Eye className="h-4 w-4" />
              </Button>
            ) : null}

            {canEdit && !ro ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEdit(row.original)}
                disabled={isFetchingItemId === row.original.id}
                title="Edit"
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : !onView && ro && canRead(requiredModule) ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEdit(row.original)}
                disabled={isFetchingItemId === row.original.id}
                title="View"
                className="h-8 w-8"
              >
                <Eye className="h-4 w-4" />
              </Button>
            ) : null}

            {canDelete ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDeleteClick(row.original.id)}
                title="Delete"
                className="h-8 w-8 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ], [columns, requiredModule, rowIsReadOnly, canRead, canEdit, canDelete, isFetchingItemId, onView]);

  if (!canRead(requiredModule)) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view {title.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  }

  const formIsReadOnly = editingItem ? (rowIsReadOnly?.(editingItem) ?? false) : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        {/* Built-in Add Button (can be hidden) */}
        {!hideAddButton && (
          <PermissionAwareButton
            requiredModule={requiredModule}
            requiredAction="write"
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            showTooltip={true}
            tooltipMessage={`You need write permission for ${requiredModule} to add new items`}
          >
            <Plus className="mr-2 h-4 w-4" />
            {addButtonLabel}
          </PermissionAwareButton>
        )}
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <AppDataTable<T>
          data={data}
          columns={enhancedColumns}
          pageCount={Math.ceil(data.length / 10)}
          fitToWidth={fitToWidth}
        />
      </div>

      {(canEdit || (formIsReadOnly && canRead(requiredModule))) && (
        <FormComponent
          open={isFormOpen}
          onOpenChange={(open: boolean) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          initialData={editingItem}
          readOnly={formIsReadOnly}
          onSubmit={(payload: Partial<T>) => {
            if (editingItem) return handleUpdate({ ...editingItem, ...payload });
            return handleAdd(payload);
          }}
        />
      )}

      {canDelete && (
        <DeleteDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title={`Delete ${title}?`}
          description={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`}
        />
      )}
    </div>
  );
}
