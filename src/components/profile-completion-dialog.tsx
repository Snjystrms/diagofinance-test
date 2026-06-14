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
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
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
  hideSkipButton?: boolean;
  showCloseButton?: boolean;
}

export function ProfileCompletionDialog({
  open,
  onOpenChange,
  incompleteSections,
  hideSkipButton = false,
  showCloseButton = true,
}: ProfileCompletionDialogProps) {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!hideSkipButton) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" preventClose={hideSkipButton} showCloseButton={showCloseButton && !hideSkipButton}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-muted-foreground">
            Please complete the following sections to verify your account and unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {incompleteSections.map((section) => (
            <div
              key={section.key}
              className="flex items-start gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4 backdrop-blur-sm"
            >
              <div className="flex-shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                {section.icon}
              </div>
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-semibold text-foreground">{section.title}</h4>
                <p className="mb-3 text-sm text-muted-foreground">{section.message}</p>
                <Button
                  size="sm"
                  onClick={() => handleNavigate(section.route)}
                >
                  Complete Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {!hideSkipButton && (
            <Button variant="outline" onClick={handleSkip} className="border-border/80 bg-background/70">
              I&apos;ll do this later
            </Button>
          )}
          {incompleteSections.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.back()} className="border-border/80 bg-background/70">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => handleNavigate(incompleteSections[0].route)}>
                Complete All Sections
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

