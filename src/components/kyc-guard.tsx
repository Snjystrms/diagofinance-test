"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/lib/api-auth-admin";
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog";
import { Settings, Scale, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface KyCGuardProps {
  children: React.ReactNode;
}

const KYC_APPROVED_STATUSES = ["approved", "verified", "full-verified"];

function isKyCApproved(verificationStatus: {
  personal_information?: { status?: string };
  // legal_information?: { status?: string };
  documents_verification?: { status?: string };
}): boolean {
  return (
    verificationStatus.personal_information?.status === "completed" &&
    // verificationStatus.legal_information?.status === "completed" &&
    verificationStatus.documents_verification?.status === "completed"
  );
}

export function KyCGuard({ children }: KyCGuardProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<
    Array<{
      key: "personal_information" | "documents_verification";
      title: string;
      message: string;
      route: string;
    }>
  >([]);

  useEffect(() => {
    const checkKyCStatus = async () => {
      setIsChecking(true);
      setShowDialog(false);

      if (!token || user?.type !== "user") {
        setIsChecking(false);
        return;
      }

      try {
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          const verificationStatus = response.data.verification_status;

          if (isKyCApproved(verificationStatus)) {
            setShowDialog(false);
            setIncompleteSections([]);
          } else {
            const incomplete: Array<{
              key: "personal_information" | "documents_verification";
              title: string;
              message: string;
              route: string;
            }> = [];

            if (verificationStatus.personal_information?.status !== "completed") {
              incomplete.push({
                key: "personal_information",
                title: "Personal Information",
                message:
                  verificationStatus.personal_information?.message ||
                  "Please complete your personal information to continue.",
                route: "/profile/view_profile#personal",
              });
            }
            // if (verificationStatus.legal_information?.status !== "completed") {
            //   incomplete.push({
            //     key: "legal_information",
            //     title: "Legal Information",
            //     message:
            //       verificationStatus.legal_information?.message ||
            //       "Please complete your legal information to continue.",
            //     route: "/profile/view_profile#account",
            //   });
            // }
            if (verificationStatus.documents_verification?.status !== "completed") {
              incomplete.push({
                key: "documents_verification",
                title: "Documents Verification",
                message:
                  verificationStatus.documents_verification?.message ||
                  "Please upload and verify your KYC documents to continue.",
                route: "/profile/kyc-verification",
              });
            }

            setIncompleteSections(incomplete);
            setShowDialog(true);
          }
        }
      } catch (error) {
        console.error("Failed to check KYC status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    void checkKyCStatus();
  }, [token, user?.type]);

  if (isChecking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {children}
      <ProfileCompletionDialog
        open={showDialog}
        onOpenChange={() => {}}
        hideSkipButton={true}
        showCloseButton={false}
        showGoBackButton={true}
        incompleteSections={incompleteSections.map((section) => ({
          ...section,
          icon:
            section.key === "personal_information" ? (
              <Settings className="h-5 w-5 text-orange-600" />
            ) : (
              <FileText className="h-5 w-5 text-orange-600" />
            ),
        }))}
      />
    </>
  );
}