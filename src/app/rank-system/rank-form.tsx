"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Rank } from "./columns";

interface RankFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Rank, 'id'> & { id?: string }) => void;
  initialData?: Rank | null;
}

export function RankForm({ open, onOpenChange, onSubmit, initialData }: RankFormProps) {
  const [formData, setFormData] = useState<Omit<Rank, 'id'> & { id?: string }>({
    name: "",
    downlines: 0,
    perDownline: "",
    description: "",
    rewardAmount: "",
    active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: "",
        downlines: 0,
        perDownline: "",
        description: "",
        rewardAmount: "",
        active: true,
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? 'Edit Rank' : 'Add New Rank'}</DialogTitle>
          </DialogHeader>
         
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="downlines" className="text-right">Downlines</Label>
              <Input
                id="downlines"
                name="downlines"
                type="number"
                min="0"
                value={formData.downlines}
                onChange={(e) => setFormData(prev => ({ ...prev, downlines: Number(e.target.value) }))}
                className="col-span-3"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="perDownline" className="text-right">Per Downline</Label>
              <Input
                id="perDownline"
                name="perDownline"
                value={formData.perDownline}
                onChange={(e) => setFormData(prev => ({ ...prev, perDownline: e.target.value }))}
                className="col-span-3"
                placeholder="e.g. $5,000 / ₹1 Lakh"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rewardAmount" className="text-right">Reward</Label>
              <Input
                id="rewardAmount"
                name="rewardAmount"
                value={formData.rewardAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, rewardAmount: e.target.value }))}
                className="col-span-3"
                placeholder="e.g. $500"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Enter description..."
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="active" className="text-right">Active</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>
         
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}