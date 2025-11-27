"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AppDataTable } from "@/components/app-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { FormDialog } from './dialogs/form-dialog';
import { DeleteDialog } from './dialogs/delete-dialog';
import { Pencil, Trash2 } from "lucide-react";

export interface CrudDataTableProps<T extends { id: string }> {
  // Table data and columns
  data: T[];
  columns: ColumnDef<T>[];
  initialData: T[]; // For local state management
  
  // Form component
  formComponent: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<T> & { id?: string }) => void;
    initialData?: T | null;
  }>;
  
  // Text content
  title: string;
  description?: string;
  addButtonLabel?: string;
  
  // Callbacks
  onAdd: (data: Omit<T, 'id'>) => Promise<void> | void;
  onUpdate: (data: T) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function CrudDataTable<T extends { id: string }>({
  data,
  columns,
  initialData,
  formComponent: FormComponent,
  title,
  description,
  addButtonLabel = "Add New",
  onAdd,
  onUpdate,
  onDelete,
}: CrudDataTableProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [localData, setLocalData] = useState<T[]>(initialData);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
  

  // Enhance columns with actions
  const enhancedColumns: ColumnDef<T>[] = [
    ...columns,
    {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-start space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteClick(row.id)}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingItem(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <AppDataTable<T>
          data={data}
          columns={enhancedColumns}
          pageCount={Math.ceil(data.length / 10)} // Simple pagination
        />
      </div>

      <FormComponent
  open={isFormOpen}
  onOpenChange={setIsFormOpen}
  initialData={editingItem}
  onSubmit={(data: Partial<T>) => {
    if (editingItem) {
      handleUpdate({ ...editingItem, ...data });
    } else {
      handleAdd(data);
    }
  }}
/>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={`Delete ${title}?`}
        description={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`}
      />
    </div>
  );
}
