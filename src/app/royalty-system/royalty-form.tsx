"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RoyaltyLevel } from "./columns";

interface RoyaltyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<RoyaltyLevel, 'id'> & { id?: string }) => void;
  initialData?: RoyaltyLevel | null;
}

export function RoyaltyForm({ open, onOpenChange, onSubmit, initialData }: RoyaltyFormProps) {
  const [formData, setFormData] = useState<Omit<RoyaltyLevel, 'id'> & { id?: string }>({
    level: "",
    incomePercent: "",
    requiredDirects: "",
    packageAmount: "",
    active: true,
  });

  // Fixed: Use useEffect instead of useState for handling form data updates
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        level: "",
        incomePercent: "",
        requiredDirects: "",
        packageAmount: "",
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
            <DialogTitle>{initialData ? 'Edit Royalty Level' : 'Add New Royalty Level'}</DialogTitle>
          </DialogHeader>
         
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level" className="text-right">Level</Label>
              <Input
                id="level"
                name="level"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="incomePercent" className="text-right">Income %</Label>
              <Input
                id="incomePercent"
                name="incomePercent"
                type="number"
                step="0.1"
                value={formData.incomePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, incomePercent: e.target.value }))}
                className="col-span-3"
                placeholder="e.g. 10"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requiredDirects" className="text-right">Required Directs</Label>
              <Input
                id="requiredDirects"
                name="requiredDirects"
                type="number"
                min="0"
                value={formData.requiredDirects}
                onChange={(e) => setFormData(prev => ({ ...prev, requiredDirects: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
           
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="packageAmount" className="text-right">Package Amount</Label>
              <Input
                id="packageAmount"
                name="packageAmount"
                type="number"
                min="0"
                value={formData.packageAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, packageAmount: e.target.value }))}
                className="col-span-3"
                placeholder="e.g. 500"
                required
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