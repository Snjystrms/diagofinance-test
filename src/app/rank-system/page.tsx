'use client'

import { useState } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/components/main-layout";
import { RankForm } from "./rank-form";
import { Rank, getColumns } from "./columns";
import { CrudDataTable } from "@/components/crud-data-table";

// Initial data for the ranks
const initialData: Rank[] = [
  {
    id: "1",
    name: "Novice",
    downlines: 5,
    perDownline: "$5,000",
    description: "Total team business $25,000 across 5 legs (~$5,000 per leg).",
    rewardAmount: "$500",
    active: true,
  },
  {
    id: "2",
    name: "Beginner",
    downlines: 2,
    perDownline: "$50,000",
    description: "Two separate legs at $50,000 each (min $100,000 combined across those legs).",
    rewardAmount: "$1,500",
    active: true,
  },
  {
    id: "3",
    name: "Competent",
    downlines: 3,
    perDownline: "₹1 Lakh",
    description: "3 downlines; ₹1 Lakh business required from each leg.",
    rewardAmount: "$3,000",
    active: true,
  },
  {
    id: "4",
    name: "Talented",
    downlines: 4,
    perDownline: "₹1.5 Lakh",
    description: "4 downlines; each downline must have ₹1.5 Lakh business.",
    rewardAmount: "$5,000",
    active: true,
  },
  {
    id: "5",
    name: "Skilled",
    downlines: 5,
    perDownline: "₹2.5 Lakh",
    description: "5 downlines; ₹2.5 Lakh from each leg.",
    rewardAmount: "$10,000",
    active: true,
  },
  {
    id: "6",
    name: "Proficient",
    downlines: 6,
    perDownline: "₹5 Lakh",
    description: "6 downlines; ₹5 Lakh from each downline.",
    rewardAmount: "$25,000",
    active: true,
  },
  {
    id: "7",
    name: "Advanced",
    downlines: 7,
    perDownline: "1 Million",
    description: "7 downlines; 1 Million from each downline (total 7 Million for this rank).",
    rewardAmount: "$50,000",
    active: true,
  },
  {
    id: "8",
    name: "Expert",
    downlines: 8,
    perDownline: "2.5 Million",
    description: "8 downlines; 2.5 Million from each downline.",
    rewardAmount: "₹1 Lakh",
    active: true,
  },
  {
    id: "9",
    name: "Legend",
    downlines: 9,
    perDownline: "5 Million",
    description: "9 downlines; 5 Million from each downline.",
    rewardAmount: "₹2.5 Lakh",
    active: true,
  },
];

export default function RankSystemPage() {
  const [data, setData] = useState<Rank[]>(initialData);

  const handleAddRank = async (newRank: Omit<Rank, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const rankToAdd = { ...newRank, id } as Rank;
    setData(prev => [...prev, rankToAdd]);
    return Promise.resolve();
  };

  const handleUpdateRank = async (updatedRank: Rank) => {
    setData(prev => prev.map(rank =>
      rank.id === updatedRank.id ? updatedRank : rank
    ));
    return Promise.resolve();
  };

  const handleDeleteRank = async (id: string) => {
    setData(prev => prev.filter(rank => rank.id !== id));
    return Promise.resolve();
  };

  // Use the advanced columns from columns.tsx
  const columns = getColumns({
    onEdit: (rank: Rank) => {
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
          <CrudDataTable<Rank>
            data={data}
            columns={columns}
            initialData={data}
            formComponent={RankForm}
            title="Ranks"
            onAdd={handleAddRank}
            onUpdate={handleUpdateRank}
            onDelete={handleDeleteRank}
          />
        </div>
      </div>
    </MainLayout>
  );
}