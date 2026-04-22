"use client";

import { AlertCircle, Scale, Settings, FileText, Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProfileContentSkeleton } from "@/components/loading/client-page-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { authApi, admin2FAApi, manager2FAApi, type ProfileViewResponse } from "@/lib/api";
import {
  updatePersonalInformation,
  updateLegalInformation,
  type UpdatePersonalInformationRequest,
  type UpdateLegalInformationRequest
} from "@/utils/operations";
import { TwoFactorModal } from "@/components/two-factor-modal";
import { cn } from "@/lib/utils";

export default function ProfileContent() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLegalInfo, setSavingLegalInfo] = useState(false);
  const [profileData, setProfileData] = useState<ProfileViewResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dobDate, setDobDate] = useState<Date | undefined>(undefined);
  const [dobMonth, setDobMonth] = useState<Date | undefined>(undefined);
  const [dobValue, setDobValue] = useState("");

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await authApi.getProfileView(token);
        
        if (response.success && response.data) {
          setProfileData(response.data);
          setIs2FAEnabled(response.data.user?.google_2FA_status || false);
          
          // Initialize DOB date state
          if (response.data.personal_information?.dob) {
            try {
              const dobDate = new Date(response.data.personal_information.dob);
              if (isValidDate(dobDate)) {
                setDobDate(dobDate);
                setDobMonth(dobDate);
                setDobValue(formatDateDisplay(dobDate));
              }
            } catch (error) {
              console.error("Error parsing DOB:", error);
            }
          } else {
            setDobDate(undefined);
            setDobMonth(undefined);
            setDobValue("");
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  // Check 2FA status when component mounts and when user changes
  useEffect(() => {
    if (user?.id && token) {
      checkTwoFactorStatus();
    }
  }, [user, token]);

  // Handle hash routing for tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'personal' || hash === 'account' || hash === 'activity' || hash === 'security') {
        setActiveTab(hash);
      }
      
      // Listen for hash changes
      const handleHashChange = () => {
        const newHash = window.location.hash.replace('#', '');
        if (newHash === 'personal' || newHash === 'account' || newHash === 'activity' || newHash === 'security') {
          setActiveTab(newHash);
        }
      };
      
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const checkTwoFactorStatus = async () => {
    if (!user?.id || !token) return;
    
    setIsLoading2FAStatus(true);
    
    try {
      // Use appropriate API based on user type
      const isAdmin = user.type === 'admin';
      const isManager = user.type === 'manager';
      let response;
      
      if (isAdmin) {
        response = await admin2FAApi.getTwoFactorStatus(user.id, token);
      } else if (isManager) {
        response = await manager2FAApi.getTwoFactorStatus(user.id, token);
      } else {
        response = await authApi.getTwoFactorStatus(Number(user.id), token);
      }
      
      if (response.success && response.data) {
        setIs2FAEnabled(response.data.google_2FA_status);
        // Also update profileData if it exists
        if (profileData) {
          setProfileData({
            ...profileData,
            user: {
              ...profileData.user,
              google_2FA_status: response.data.google_2FA_status,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setIsLoading2FAStatus(false);
    }
  };

  const handle2FAStatusChange = async () => {
    // Refresh 2FA status and profile data
    await checkTwoFactorStatus();
    // Also reload profile view to get updated data
    if (token) {
      try {
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          setProfileData(response.data);
        }
      } catch (error) {
        console.error("Error reloading profile:", error);
      }
    }
    // Dispatch custom event to notify profile-header to refresh
    window.dispatchEvent(new CustomEvent('2fa-status-changed'));
  };

  // Handle personal information submission
  const handleSubmit = async () => {
    if (!token || !profileData) {
      toast.error("Please log in to update your profile");
      return;
    }

    try {
      setSaving(true);
      const updateData: UpdatePersonalInformationRequest = {
        dob: profileData.personal_information.dob || undefined,
        address: profileData.personal_information.address || undefined,
        passport_id_number: profileData.personal_information.passport_id_number || undefined,
        pin_code: profileData.personal_information.pin_code || undefined,
        nationality: profileData.personal_information.nationality || undefined,
        employment_status: profileData.personal_information.employment_status || undefined,
        tax_number: profileData.personal_information.tax_number || undefined,
        other_id_number: profileData.personal_information.other_id_number || undefined,
        client_type: profileData.personal_information.client_type || undefined,
        country: profileData.personal_information.country || undefined,
        state: profileData.personal_information.state || undefined,
        city: profileData.personal_information.city || undefined,
      };

      const response = await updatePersonalInformation(updateData, token);

      if (response.success) {
        toast.success(response.message || "Personal information updated successfully");
        // Reload profile data
        const profileResponse = await authApi.getProfileView(token);
        if (profileResponse.success && profileResponse.data) {
          setProfileData(profileResponse.data);
        }
      } else {
        toast.error(response.message || "Failed to update personal information");
      }
    } catch (error) {
      console.error("Error updating personal information:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update personal information");
    } finally {
      setSaving(false);
    }
  };

  // Handle legal information submission
  const handleSaveLegalInformation = async () => {
    if (!token || !profileData) {
      toast.error("Please log in to update your legal information");
      return;
    }

    try {
      setSavingLegalInfo(true);
      const updateData: UpdateLegalInformationRequest = {
        politically_exposed: profileData.legal_information.politically_exposed,
        annual_income: profileData.legal_information.annual_income || undefined,
        source_of_income: profileData.legal_information.source_of_income || undefined,
        estimated_net_worth: profileData.legal_information.estimated_net_worth || undefined,
        purpose_of_opening_account: profileData.legal_information.purpose_of_opening_account || undefined,
        estimated_annual_amount: profileData.legal_information.estimated_annual_amount || undefined,
      };

      const response = await updateLegalInformation(updateData, token);

      if (response.success) {
        toast.success(response.message || "Legal information updated successfully");
        // Reload profile data
        const profileResponse = await authApi.getProfileView(token);
        if (profileResponse.success && profileResponse.data) {
          setProfileData(profileResponse.data);
        }
      } else {
        toast.error(response.message || "Failed to update legal information");
      }
    } catch (error) {
      console.error("Error updating legal information:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update legal information");
    } finally {
      setSavingLegalInfo(false);
    }
  };

  // Handle input changes for personal information
  const handlePersonalInfoChange = (field: keyof ProfileViewResponse["personal_information"], value: string | null) => {
    if (!profileData) return;
    setProfileData({
      ...profileData,
      personal_information: {
        ...profileData.personal_information,
        [field]: value,
      },
    });
  };

  // Handle input changes for legal information
  const handleLegalInfoChange = (field: keyof ProfileViewResponse["legal_information"], value: string | number | boolean | null) => {
    if (!profileData) return;
    setProfileData({
      ...profileData,
      legal_information: {
        ...profileData.legal_information,
        [field]: value,
      },
    });
  };

  // Format date for input field
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Format date for display (e.g., "June 01, 2025")
  const formatDateDisplay = (date: Date | undefined): string => {
    if (!date) return "";
    try {
      return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Check if date is valid
  const isValidDate = (date: Date | undefined): boolean => {
    if (!date) return false;
    return !isNaN(date.getTime());
  };

  // Get verification status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800">
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  // Pagination for login history
  const totalPages = profileData?.login_history
    ? Math.ceil(profileData.login_history.length / itemsPerPage)
    : 0;
  const paginatedHistory = profileData?.login_history
    ? profileData.login_history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  if (loading) {
    return <ProfileContentSkeleton />;
  }

  if (!profileData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  const verificationStatus = profileData.verification_status;
  const overallStatus = profileData.user.verification_status?.toLowerCase() || "";

  // Determine verification badge based on status
  const getVerificationBadge = () => {
    if (overallStatus === "full-verified" || overallStatus === "approved") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800">
          Verified
        </Badge>
      );
    }
    if (overallStatus === "semi-verified") {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          Semi Verified
        </Badge>
      );
    }
    if (overallStatus === "pending" || overallStatus === "rejected") {
      return (
        <Badge variant="destructive" className="ml-2">
          {overallStatus === "rejected" ? "Rejected" : "Not Verified"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline">Pending</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Status Section */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Your Profile Status:
                {getVerificationBadge()}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Personal Information Status */}
            <Card className={`border-2 ${
              verificationStatus.personal_information.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.personal_information.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <Scale className={`h-5 w-5 ${
                      verificationStatus.personal_information.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Personal Information</h4>
                    <p className="text-xs text-muted-foreground">
                      {verificationStatus.personal_information.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.personal_information.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Information Status */}
            <Card className={`border-2 ${
              verificationStatus.legal_information.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.legal_information.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <Settings className={`h-5 w-5 ${
                      verificationStatus.legal_information.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Legal Information</h4>
                    <p className="text-xs text-muted-foreground">
                      {verificationStatus.legal_information.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.legal_information.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Verification Status */}
            <Card className={`border-2 ${
              verificationStatus.documents_verification.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.documents_verification.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      verificationStatus.documents_verification.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Documents Verification</h4>
                    <p className="text-xs text-muted-foreground">
                      {verificationStatus.documents_verification.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.documents_verification.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="account">Legal Information</TabsTrigger>
          <TabsTrigger value="activity">Account Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Basic Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Personal Information</CardTitle>
                <CardDescription>Update your personal details and identification information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="px-1">Date of Birth</Label>
                    <div className="relative flex gap-2">
                      <Input
                        id="dob"
                        value={dobValue}
                        placeholder="June 01, 2025"
                        className="bg-background pr-10"
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setDobValue(inputValue);
                          const date = new Date(inputValue);
                          if (isValidDate(date)) {
                            setDobDate(date);
                            setDobMonth(date);
                            handlePersonalInfoChange("dob", date.toISOString().split("T")[0]);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setCalendarOpen(true);
                          }
                        }}
                      />
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-picker"
                            variant="ghost"
                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                          >
                            <CalendarIcon className="size-3.5" />
                            <span className="sr-only">Select date</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="end"
                          alignOffset={-8}
                          sideOffset={10}
                        >
                          <Calendar
                            mode="single"
                            selected={dobDate}
                            captionLayout="dropdown"
                            month={dobMonth}
                            onMonthChange={setDobMonth}
                            onSelect={(date) => {
                              setDobDate(date);
                              if (date) {
                                setDobValue(formatDateDisplay(date));
                                handlePersonalInfoChange("dob", date.toISOString().split("T")[0]);
                              } else {
                                setDobValue("");
                                handlePersonalInfoChange("dob", null);
                              }
                              setCalendarOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={profileData.personal_information.nationality || ""}
                      onChange={(e) => handlePersonalInfoChange("nationality", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter nationality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_id_number">Passport ID Number</Label>
                    <Input
                      id="passport_id_number"
                      value={profileData.personal_information.passport_id_number || ""}
                      onChange={(e) => handlePersonalInfoChange("passport_id_number", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter passport ID number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_number">Tax Number</Label>
                    <Input
                      id="tax_number"
                      value={profileData.personal_information.tax_number || ""}
                      onChange={(e) => handlePersonalInfoChange("tax_number", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter tax number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="other_id_number">Other ID Number</Label>
                    <Input
                      id="other_id_number"
                      value={profileData.personal_information.other_id_number || ""}
                      onChange={(e) => handlePersonalInfoChange("other_id_number", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter other ID number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin_code">PIN Code</Label>
                    <Input
                      id="pin_code"
                      value={profileData.personal_information.pin_code || ""}
                      onChange={(e) => handlePersonalInfoChange("pin_code", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter PIN code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location and Status Information */}
            <Card>
              <CardHeader>
                <CardTitle>Location and Status Information</CardTitle>
                <CardDescription>Update your employment status, client type, and location details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Employment Status</Label>
                    <Select
                      value={profileData.personal_information.employment_status || ""}
                      onValueChange={(value) => handlePersonalInfoChange("employment_status", value || null)}
                    >
                      <SelectTrigger id="employment_status" className="w-full">
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_type">Client Type</Label>
                    <Select
                      value={profileData.personal_information.client_type || ""}
                      onValueChange={(value) => handlePersonalInfoChange("client_type", value || null)}
                    >
                      <SelectTrigger id="client_type" className="w-full">
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.personal_information.country || ""}
                      onChange={(e) => handlePersonalInfoChange("country", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profileData.personal_information.state || ""}
                      onChange={(e) => handlePersonalInfoChange("state", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileData.personal_information.city || ""}
                      onChange={(e) => handlePersonalInfoChange("city", e.target.value || null)}
                      className="w-full"
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your full address..."
                      value={profileData.personal_information.address || ""}
                      onChange={(e) => handlePersonalInfoChange("address", e.target.value || null)}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Legal Information */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Legal Information</CardTitle>
              <CardDescription>Provide your legal and financial information for account verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="politically_exposed">Politically Exposed Person</Label>
                  <p className="text-muted-foreground text-sm">
                    Are you a politically exposed person (PEP)?
                  </p>
                  <div className="flex items-center gap-4">
                    <Switch
                      id="politically_exposed"
                      checked={profileData.legal_information.politically_exposed}
                      onCheckedChange={(checked) =>
                        handleLegalInfoChange("politically_exposed", checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {profileData.legal_information.politically_exposed ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="annual_income">Annual Income</Label>
                  <p className="text-muted-foreground text-sm">
                    Your total annual income
                  </p>
                  <Input
                    id="annual_income"
                    type="number"
                    step="0.01"
                    value={profileData.legal_information.annual_income || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("annual_income", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="w-full"
                    placeholder="Enter annual income"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="source_of_income">Source of Income</Label>
                  <p className="text-muted-foreground text-sm">
                    Primary source of your income
                  </p>
                  <Input
                    id="source_of_income"
                    value={profileData.legal_information.source_of_income || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("source_of_income", e.target.value || null)
                    }
                    className="w-full"
                    placeholder="e.g., Employment - Software Developer"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="estimated_net_worth">Estimated Net Worth</Label>
                  <p className="text-muted-foreground text-sm">
                    Your estimated total net worth
                  </p>
                  <Input
                    id="estimated_net_worth"
                    type="number"
                    step="0.01"
                    value={profileData.legal_information.estimated_net_worth || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("estimated_net_worth", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="w-full"
                    placeholder="Enter estimated net worth"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="purpose_of_opening_account">Purpose of Opening Account</Label>
                  <p className="text-muted-foreground text-sm">
                    Main reason for opening this account
                  </p>
                  <Textarea
                    id="purpose_of_opening_account"
                    value={profileData.legal_information.purpose_of_opening_account || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("purpose_of_opening_account", e.target.value || null)
                    }
                    className="w-full"
                    placeholder="e.g., Forex trading and investment"
                    rows={3}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="estimated_annual_amount">Estimated Annual Amount</Label>
                  <p className="text-muted-foreground text-sm">
                    Estimated annual transaction amount
                  </p>
                  <Input
                    id="estimated_annual_amount"
                    type="number"
                    step="0.01"
                    value={profileData.legal_information.estimated_annual_amount || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("estimated_annual_amount", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="w-full"
                    placeholder="Enter estimated annual amount"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveLegalInformation}
                disabled={savingLegalInfo}
                size="lg"
              >
                {savingLegalInfo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Legal Information"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Account Activity Logs */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity Logs</CardTitle>
              <CardDescription>Login History</CardDescription>
            </CardHeader>
            <CardContent>
              {profileData.login_history && profileData.login_history.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Browser</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{log.date}</TableCell>
                            <TableCell>{log.time}</TableCell>
                            <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                            <TableCell>{log.browser}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, profileData.login_history.length)} of {profileData.login_history.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No login history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-muted-foreground text-sm">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading2FAStatus ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : is2FAEnabled || profileData?.user?.google_2FA_status ? (
                      <>
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800">
                          Enabled
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setTwoFactorModalOpen(true)}
                        >
                          Configure
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">Disabled</Badge>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setTwoFactorModalOpen(true)}
                        >
                          Enable 2FA
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TwoFactorModal 
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        is2FAEnabled={is2FAEnabled || profileData?.user?.google_2FA_status || false}
        onStatusChange={handle2FAStatusChange}
      />
    </div>
  );
}
