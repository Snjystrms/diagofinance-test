// C:\Users\DELL\Desktop\crminhouse\src\components\permission-aware-crud-table.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppDataTable } from '@/components/app-data-table';
import { DeleteDialog } from '@/components/dialogs/delete-dialog';
import { PermissionAwareButton, PermissionGate } from '@/components/permission-aware-button';
import { usePermissions } from '@/lib/permissions';

export interface PermissionAwareCrudDataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  initialData: T[];
  formComponent: React.ComponentType<any>;
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
  hideAddButton = false, // ✅ default false
}: PermissionAwareCrudDataTableProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [localData] = useState<T[]>(initialData);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { canWrite, canRead } = usePermissions();

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

  const handleEdit = (item: T) => {
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
        return (
          <div className="flex justify-end space-x-2">
            {canWrite(requiredModule) ? (
              <PermissionGate requiredModule={requiredModule} requiredAction="write">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(row.original)}
                  title={ro ? "View" : "Edit"}
                >
                  {ro ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              </PermissionGate>
            ) : ro && canRead(requiredModule) ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(row.original)}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
            ) : null}

            <PermissionGate requiredModule={requiredModule} requiredAction="write">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(row.original.id)}
                className="text-destructive hover:text-destructive/80"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ], [columns, requiredModule, rowIsReadOnly, canRead, canWrite]);

  if (!canRead(requiredModule)) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view {title.toLowerCase()}.
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
        />
      </div>

      {(canWrite(requiredModule) || (formIsReadOnly && canRead(requiredModule))) && (
        <FormComponent
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          initialData={editingItem}
          readOnly={formIsReadOnly}
          onSubmit={(payload: any) => {
            if (editingItem) return handleUpdate({ ...editingItem, ...payload });
            return handleAdd(payload);
          }}
        />
      )}

      {canWrite(requiredModule) && (
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