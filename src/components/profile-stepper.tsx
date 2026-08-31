"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "./ui/stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Landmark,
} from "lucide-react";
import type { UserDashboardData } from "@/lib/api";
import { PremiumDarkLayers } from "@/components/ui/premium-dark-card";

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
  useEffect(() => {}, [hasBankDetails]);

  // Calculate status for each step
  const steps = useMemo((): StepItem[] => {
    if (!dashboardData) {
      return [];
    }

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
        icon: (
          <img
            src="/complete_profile_icon.svg"
            alt="Complete Profile"
            className="h-5 w-5 object-contain"
          />
        ),
        route: "/profile/view_profile#personal",
        order: personalInfoComplete ? 10 : 1,
      },
      {
        id: "kyc",
        title: "KYC Verification",
        description: "Upload and verify your documents",
        status: kycComplete ? "completed" : "pending",
        icon: (
          <img
            src="/kyc_verification_icon.svg"
            alt="KYC Verification"
            className="h-5 w-5 object-contain"
          />
        ),
        route: "/profile/kyc-verification",
        order: kycComplete ? 11 : 2,
      },
      {
        id: "mt5",
        title: "Open MT5 Account",
        description: "Create your first trading account",
        status: hasMt5Account ? "completed" : "pending",
        icon: (
          <img
            src="/open_mt5_account_icon.svg"
            alt="Open MT5 Account"
            className="h-5 w-5 object-contain"
          />
        ),
        route: "/my_accounts/open-trading-account",
        order: hasMt5Account ? 12 : 3,
      },
      {
        id: "deposit",
        title: "Make First Deposit",
        description: "Fund your wallet to start trading",
        status: hasDeposit ? "completed" : "pending",
        icon: (
          <img
            src="/make_first_deposit.svg"
            alt="Make First Deposit"
            className="h-5 w-5 object-contain"
          />
        ),
        route: "/funds/deposit",
        order: hasDeposit ? 13 : 4,
      },
      {
        id: "bank",
        title: "Add Bank Details",
        description: "Set up your withdrawal method",
        status: hasBankDetails ? "completed" : "pending",
        icon: <Landmark className="h-4 w-4 text-white" />,
        route: "/profile/view_profile?tab=bank",
        order: hasBankDetails ? 14 : 5,
      },
    ];

    // Sort steps: completed items at top, pending items at bottom
    const sortedSteps = stepsList.sort((a, b) => {
      const aCompleted = a.status === "completed";
      const bCompleted = b.status === "completed";

      // If both have same completion status, sort by order
      if (aCompleted === bCompleted) {
        return a.order - b.order;
      }

      // Put completed items first (top), pending items last (bottom)
      return aCompleted ? -1 : 1;
    });

    return sortedSteps;
  }, [dashboardData, hasBankDetails]);

  // Optional action (not counted in steps)
  const optionalAction = {
    id: "metatrader",
    title: "Install MetaTrader",
    description: "Download the trading platform",
    icon: <Download className="h-4 w-4" />,
    route: "https://www.metatrader5.com/en/download",
  };

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
            className="text-[11px] px-2 py-0.5 bg-gradient-to-br from-green-100 to-green-50 text-green-700 border border-green-200/50 shadow-sm dark:from-green-950/40 dark:to-green-950/20 dark:text-green-400 dark:border-green-800/50"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Done
          </Badge>
        );
      case "active":
        return (
          <Badge
            variant="default"
            className="text-[11px] px-2 py-0.5 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 border border-blue-200/50 shadow-sm dark:from-blue-950/40 dark:to-blue-950/20 dark:text-blue-400 dark:border-blue-800/50"
          >
            <Clock className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-[11px] px-2 py-0.5 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 border border-amber-200/50 shadow-sm dark:from-amber-950/40 dark:to-amber-950/20 dark:text-amber-400 dark:border-amber-800/50"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="destructive"
            className="text-[11px] px-2 py-0.5 bg-gradient-to-br from-red-100 to-red-50 text-red-700 border border-red-200/50 shadow-sm dark:from-red-950/40 dark:to-red-950/20 dark:text-red-400 dark:border-red-800/50"
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
    <Card className="relative overflow-hidden rounded-[28px] shadow-sm backdrop-blur-sm ib-portal-surface ib-portal-surface-primary h-full flex flex-col hover:shadow-lg transition-all duration-300">
      <CardHeader className="relative z-10 pb-2 pt-4 px-4 sm:px-5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-border/60 bg-muted text-foreground shadow-sm backdrop-blur-sm">
              <FileCheck className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold">
                Getting Started
              </CardTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                {completedSteps} of {totalSteps} required steps completed
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base sm:text-lg font-bold text-foreground">
              {progressPercentage.toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="relative z-10 px-4 sm:px-5 pb-4 pt-3 flex flex-1 flex-col">
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
              <div className="flex items-start gap-2.5 w-full">
                <div className="flex flex-col items-center">
                  <StepperTrigger
                    onClick={() => handleStepClick(step)}
                    className="cursor-pointer"
                  >
                    <StepperIndicator asChild>
                      <div className="flex items-center justify-center">
                        {step.icon}
                      </div>
                    </StepperIndicator>
                  </StepperTrigger>
                  {index < steps.length - 1 && <StepperSeparator />}
                </div>
                <div
                  className="flex-1 pb-3 cursor-pointer hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20 rounded-xl p-2 pt-0 -ml-2 transition-all duration-200 group border border-transparent hover:border-border/30 hover:shadow-sm"
                  onClick={() => handleStepClick(step)}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <StepperTitle className="text-[13px] font-semibold group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200">
                      {step.title}
                    </StepperTitle>
                    {getStatusBadge(step.status)}
                  </div>
                  <StepperDescription className="text-[11px] sm:text-xs">
                    {step.description}
                  </StepperDescription>
                </div>
              </div>
            </StepperItem>
          ))}
        </Stepper>

        {/* Optional Action - MetaTrader Installation — now uses premium dark card */}
  <div className="mt-auto pt-5">
           <div
            className="group relative flex items-center gap-3 cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#050505] px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => window.open(optionalAction.route, "_blank")}
          >
            <PremiumDarkLayers />
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
              {optionalAction.icon}
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              <div className="text-[13px] font-bold leading-snug text-white drop-shadow-sm">
                {optionalAction.title}
              </div>
              <div className="text-[11px] leading-snug text-white/75">
                {optionalAction.description}
              </div>
            </div>
            <img
              src="/mt5logo.png"
              alt="MetaTrader 5"
              className="relative z-10 h-9 w-auto shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
