"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// import {
//   Stepper,
//   StepperDescription,
//   StepperIndicator,
//   StepperItem,
//   StepperSeparator,
//   StepperTitle,
//   StepperTrigger,
// } from "@/components/ui/stepper";
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from "./ui/stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  FileCheck,
  Building2,
  Wallet,
  Landmark,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { UserDashboardData } from "@/lib/api";

type StepStatus = "completed" | "active" | "pending" | "error";

type StepItem = {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  icon: React.ReactNode;
  route: string;
  order: number;
};

interface ProfileStepperProps {
  dashboardData: UserDashboardData | null;
  hasBankDetails: boolean;
}

export function ProfileStepper({
  dashboardData,
  hasBankDetails,
}: ProfileStepperProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log("ProfileStepper - hasBankDetails prop:", hasBankDetails);
  }, [hasBankDetails]);

  // Calculate status for each step
  const steps = useMemo((): StepItem[] => {
    if (!dashboardData) return [];

    const profileStatus = dashboardData.profile_status?.checklist;
    const personalInfoComplete =
      profileStatus?.personal_information?.completed ?? false;
    const kycComplete =
      profileStatus?.documents_verification?.completed ?? false;
    const hasDeposit = (dashboardData.deposits?.total ?? 0) > 0;
    const hasMt5Account =
      (dashboardData.account_types?.total_accounts ?? 0) > 0 ||
      (dashboardData.mt5_users?.length ?? 0) > 0;

    const stepsList: StepItem[] = [
      {
        id: "profile",
        title: "Complete Profile",
        description: "Fill in your personal information",
        status: personalInfoComplete ? "completed" : "pending",
        icon: <User className="h-4 w-4" />,
        route: "/profile/view_profile#personal",
        order: personalInfoComplete ? 10 : 1,
      },
      {
        id: "kyc",
        title: "KYC Verification",
        description: "Upload and verify your documents",
        status: kycComplete ? "completed" : "pending",
        icon: <FileCheck className="h-4 w-4" />,
        route: "/profile/kyc-verification",
        order: kycComplete ? 11 : 2,
      },
      {
        id: "mt5",
        title: "Open MT5 Account",
        description: "Create your first trading account",
        status: hasMt5Account ? "completed" : "pending",
        icon: <Building2 className="h-4 w-4" />,
        route: "/my_accounts/open-trading-account",
        order: hasMt5Account ? 12 : 3,
      },
      {
        id: "deposit",
        title: "Make First Deposit",
        description: "Fund your wallet to start trading",
        status: hasDeposit ? "completed" : "pending",
        icon: <Wallet className="h-4 w-4" />,
        route: "/funds/deposit",
        order: hasDeposit ? 13 : 4,
      },
      {
        id: "bank",
        title: "Add Bank Details",
        description: "Set up your withdrawal method",
        status: hasBankDetails ? "completed" : "pending",
        icon: <Landmark className="h-4 w-4" />,
        route: "/profile/view_profile?tab=bank",
        order: hasBankDetails ? 14 : 5,
      },
      {
        id: "metatrader",
        title: "Install MetaTrader",
        description: "Download the trading platform",
        status: "pending",
        icon: <Download className="h-4 w-4" />,
        route: "https://www.metatrader5.com/en/download",
        order: 6,
      },
    ];

    // Sort steps: completed items at top, pending items at bottom
    return stepsList.sort((a, b) => {
      const aCompleted = a.status === "completed";
      const bCompleted = b.status === "completed";
      
      // If both have same completion status, sort by order
      if (aCompleted === bCompleted) {
        return a.order - b.order;
      }
      
      // Put completed items first (top), pending items last (bottom)
      return aCompleted ? -1 : 1;
    });
  }, [dashboardData, hasBankDetails]);

  // Find the first non-completed step
  useEffect(() => {
    const firstPendingIndex = steps.findIndex(
      (step) => step.status === "pending",
    );
    if (firstPendingIndex !== -1) {
      setActiveStep(firstPendingIndex);
    } else {
      // All steps completed
      setActiveStep(steps.length - 1);
    }
  }, [steps]);

  const handleStepClick = (step: StepItem) => {
    if (step.route.startsWith("http")) {
      window.open(step.route, "_blank");
    } else {
      router.push(step.route);
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Done
          </Badge>
        );
      case "active":
        return (
          <Badge
            variant="default"
            className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
          >
            <Clock className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          >
            <AlertCircle className="mr-1 h-3 w-3" />
            Action Needed
          </Badge>
        );
    }
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  if (!dashboardData) return null;

  return (
    <Card className="relative overflow-hidden border rounded-3xl shadow-sm backdrop-blur-sm ib-portal-surface h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/8 to-purple-500/8 rounded-full blur-3xl opacity-40" />
      <CardHeader className="relative z-10 pb-3 pt-5 px-5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
              <FileCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                Getting Started
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedSteps} of {totalSteps} steps completed
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {progressPercentage.toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-5 pb-5 pt-4">
        <Stepper
          value={activeStep}
          onValueChange={setActiveStep}
          orientation="vertical"
          className="w-full"
        >
          {steps.map((step, index) => (
            <StepperItem
              key={step.id}
              step={index}
              completed={step.status === "completed"}
              className="w-full"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex flex-col items-center">
                  <StepperTrigger
                    onClick={() => handleStepClick(step)}
                    className="cursor-pointer"
                  >
                    <StepperIndicator>
                      {step.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        step.icon
                      )}
                    </StepperIndicator>
                  </StepperTrigger>
                  {index < steps.length - 1 && <StepperSeparator />}
                </div>
                <div
                  className="flex-1 pb-6 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -ml-2 transition-colors group"
                  onClick={() => handleStepClick(step)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <StepperTitle className="text-sm font-semibold group-hover:underline underline-offset-2 decoration-2 transition-all">
                      {step.title}
                    </StepperTitle>
                    {getStatusBadge(step.status)}
                  </div>
                  <StepperDescription className="text-xs">
                    {step.description}
                  </StepperDescription>
                </div>
              </div>
            </StepperItem>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}
