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
          <DialogDescription className="pt-2 text-base text-foreground/72">
            Please complete the following sections to verify your account and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {incompleteSections.map((section) => (
            <div
              key={section.key}
              className="flex items-start gap-4 rounded-xl border border-orange-500/35 bg-card/96 p-4 shadow-[0_18px_40px_-28px_rgba(249,115,22,0.45)] backdrop-blur-sm"
            >
              <div className="flex-shrink-0 rounded-lg border border-orange-500/20 bg-orange-500/12 p-2 text-orange-400">
                {section.icon}
              </div>
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-semibold text-foreground">{section.title}</h4>
                <p className="mb-3 text-sm text-foreground/70">{section.message}</p>
                <Button
                  size="sm"
                  onClick={() => handleNavigate(section.route)}
                  className="bg-orange-600 text-white shadow-[0_12px_24px_-16px_rgba(249,115,22,0.9)] hover:bg-orange-500"
                >
                  Complete Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleSkip} className="border-border/80 bg-background/70">
            I&apos;ll do this later
          </Button>
          {incompleteSections.length > 0 && (
            <Button
              onClick={() => handleNavigate(incompleteSections[0].route)}
              className="bg-orange-600 text-white hover:bg-orange-500"
            >
              Complete All Sections
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

