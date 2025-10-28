'use client';

import { useState } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/components/main-layout";
import { RoyaltyForm } from "./royalty-form";
import { RoyaltyLevel, getColumns } from "./columns";
import { CrudDataTable } from "@/components/crud-data-table";

// Initial data for the royalty system
const initialData: RoyaltyLevel[] = [
  { id: "1", level: "1", incomePercent: "10", requiredDirects: "0", packageAmount: "500", active: true },
  { id: "2", level: "2", incomePercent: "8", requiredDirects: "2", packageAmount: "500", active: true },
  { id: "3", level: "3", incomePercent: "5", requiredDirects: "3", packageAmount: "500", active: true },
  { id: "4", level: "4", incomePercent: "3", requiredDirects: "4", packageAmount: "500", active: true },
  { id: "5", level: "5", incomePercent: "2", requiredDirects: "5", packageAmount: "500", active: true },
  { id: "6", level: "6", incomePercent: "1", requiredDirects: "6", packageAmount: "500", active: true },
  { id: "7", level: "7", incomePercent: "0.8", requiredDirects: "7", packageAmount: "500", active: true },
  { id: "8", level: "8", incomePercent: "0.6", requiredDirects: "8", packageAmount: "500", active: true },
  { id: "9", level: "9", incomePercent: "0.5", requiredDirects: "9", packageAmount: "500", active: true },
  { id: "10", level: "10", incomePercent: "0.5", requiredDirects: "10", packageAmount: "500", active: true },
  { id: "11", level: "11", incomePercent: "0.4", requiredDirects: "11", packageAmount: "500", active: true },
  { id: "12", level: "12", incomePercent: "0.4", requiredDirects: "12", packageAmount: "500", active: true },
  { id: "13", level: "13", incomePercent: "0.3", requiredDirects: "13", packageAmount: "500", active: true },
  { id: "14", level: "14", incomePercent: "0.3", requiredDirects: "14", packageAmount: "500", active: true },
  { id: "15", level: "15", incomePercent: "0.3", requiredDirects: "15", packageAmount: "500", active: true },
  { id: "16", level: "16", incomePercent: "0.2", requiredDirects: "16", packageAmount: "500", active: true },
  { id: "17", level: "17", incomePercent: "0.2", requiredDirects: "17", packageAmount: "500", active: true },
  { id: "18", level: "18", incomePercent: "0.2", requiredDirects: "18", packageAmount: "500", active: true },
  { id: "19", level: "19", incomePercent: "0.1", requiredDirects: "19", packageAmount: "500", active: true },
  { id: "20", level: "20", incomePercent: "0.1", requiredDirects: "20", packageAmount: "500", active: true }
];

export default function RoyaltySystemPage() {
  const [data, setData] = useState<RoyaltyLevel[]>(initialData);

  const handleAddRoyalty = async (newRoyalty: Omit<RoyaltyLevel, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const royaltyToAdd = { ...newRoyalty, id } as RoyaltyLevel;
    setData(prev => [...prev, royaltyToAdd]);
    return Promise.resolve();
  };

  const handleUpdateRoyalty = async (updatedRoyalty: RoyaltyLevel) => {
    setData(prev => prev.map(royalty =>
      royalty.id === updatedRoyalty.id ? updatedRoyalty : royalty
    ));
    return Promise.resolve();
  };

  const handleDeleteRoyalty = async (id: string) => {
    setData(prev => prev.filter(royalty => royalty.id !== id));
    return Promise.resolve();
  };

  // Use the advanced columns from columns.tsx instead of basic ones
  const columns = getColumns({
    onEdit: (royalty: RoyaltyLevel) => {
      // This will be handled by CrudDataTable
    },
    onDelete: (id: string) => {
      // This will be handled by CrudDataTable
    },
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <div className="space-y-4">
          <CrudDataTable<RoyaltyLevel>
            data={data}
            columns={columns}
            initialData={data}
            formComponent={RoyaltyForm}
            title="Royalty Levels"
            onAdd={handleAddRoyalty}
            onUpdate={handleUpdateRoyalty}
            onDelete={handleDeleteRoyalty}
          />
        </div>
      </div>
    </MainLayout>
  );
}