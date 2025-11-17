"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, Scale, Settings, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface IncompleteSection {
  key: "personal_information" | "legal_information" | "documents_verification";
  title: string;
  message: string;
  route: string;
  icon: React.ReactNode;
}

interface ProfileCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteSections: IncompleteSection[];
}

export function ProfileCompletionDialog({
  open,
  onOpenChange,
  incompleteSections,
}: ProfileCompletionDialogProps) {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    onOpenChange(false);
    router.push(route);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Please complete the following sections to verify your account and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {incompleteSections.map((section) => (
            <div
              key={section.key}
              className="flex items-start gap-4 p-4 border-2 border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50/50 dark:bg-orange-950/20"
            >
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{section.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{section.message}</p>
                <Button
                  size="sm"
                  onClick={() => handleNavigate(section.route)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Complete Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleSkip}>
            I'll do this later
          </Button>
          {incompleteSections.length > 0 && (
            <Button
              onClick={() => handleNavigate(incompleteSections[0].route)}
              className="bg-primary hover:bg-primary/90"
            >
              Complete All Sections
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

