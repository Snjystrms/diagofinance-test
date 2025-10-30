"use client";

import { Shield, Key, Trash2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { 
  getPersonalInformation, 
  updatePersonalInformation,
  getLegalInformation,
  updateLegalInformation,
  type PersonalInformation,
  type UpdatePersonalInformationRequest,
  type LegalInformation,
  type UpdateLegalInformationRequest
} from "@/utils/operations";

export default function ProfileContent() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLegalInfo, setLoadingLegalInfo] = useState(false);
  const [savingLegalInfo, setSavingLegalInfo] = useState(false);
  const [formData, setFormData] = useState<PersonalInformation>({
    dob: null,
    address: null,
    passport_id_number: null,
    pin_code: null,
    nationality: null,
    employment_status: null,
    tax_number: null,
    other_id_number: null,
    client_type: "",
    country: "",
    state: null,
    city: null,
  });

  const [legalInfo, setLegalInfo] = useState({
    politically_exposed: false,
    annual_income: 0,
    source_of_income: "",
    estimated_net_worth: 0,
    purpose_of_opening_account: "",
    estimated_annual_amount: 0,
  });

  // Load personal information on mount
  useEffect(() => {
    const loadPersonalInformation = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await getPersonalInformation(token);
        
        if (response.success && response.data) {
          setFormData({
            dob: response.data.dob || null,
            address: response.data.address || null,
            passport_id_number: response.data.passport_id_number || null,
            pin_code: response.data.pin_code || null,
            nationality: response.data.nationality || null,
            employment_status: response.data.employment_status || null,
            tax_number: response.data.tax_number || null,
            other_id_number: response.data.other_id_number || null,
            client_type: response.data.client_type || "",
            country: response.data.country || "",
            state: response.data.state || null,
            city: response.data.city || null,
          });
        }
      } catch (error) {
        console.error("Error loading personal information:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load personal information");
      } finally {
        setLoading(false);
      }
    };

    loadPersonalInformation();
  }, [token]);

  // Load legal information on mount
  useEffect(() => {
    const loadLegalInformation = async () => {
      if (!token) return;

      try {
        setLoadingLegalInfo(true);
        const response = await getLegalInformation(token);
        
        if (response.success && response.data) {
          setLegalInfo({
            politically_exposed: response.data.politically_exposed || false,
            annual_income: parseFloat(response.data.annual_income) || 0,
            source_of_income: response.data.source_of_income || "",
            estimated_net_worth: parseFloat(response.data.estimated_net_worth) || 0,
            purpose_of_opening_account: response.data.purpose_of_opening_account || "",
            estimated_annual_amount: parseFloat(response.data.estimated_annual_amount) || 0,
          });
        }
      } catch (error) {
        console.error("Error loading legal information:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load legal information");
      } finally {
        setLoadingLegalInfo(false);
      }
    };

    loadLegalInformation();
  }, [token]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!token) {
      toast.error("Please log in to update your profile");
      return;
    }

    try {
      setSaving(true);
      const updateData: UpdatePersonalInformationRequest = {
        dob: formData.dob || undefined,
        address: formData.address || undefined,
        passport_id_number: formData.passport_id_number || undefined,
        pin_code: formData.pin_code || undefined,
        nationality: formData.nationality || undefined,
        employment_status: formData.employment_status || undefined,
        tax_number: formData.tax_number || undefined,
        other_id_number: formData.other_id_number || undefined,
        client_type: formData.client_type || undefined,
        country: typeof formData.country === "string" ? formData.country : String(formData.country || ""),
        state: formData.state || undefined,
        city: formData.city || undefined,
      };

      const response = await updatePersonalInformation(updateData, token);

      if (response.success) {
        toast.success(response.message || "Personal information updated successfully");
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
    if (!token) {
      toast.error("Please log in to update your legal information");
      return;
    }

    try {
      setSavingLegalInfo(true);
      const updateData: UpdateLegalInformationRequest = {
        politically_exposed: legalInfo.politically_exposed,
        annual_income: legalInfo.annual_income || undefined,
        source_of_income: legalInfo.source_of_income || undefined,
        estimated_net_worth: legalInfo.estimated_net_worth || undefined,
        purpose_of_opening_account: legalInfo.purpose_of_opening_account || undefined,
        estimated_annual_amount: legalInfo.estimated_annual_amount || undefined,
      };

      const response = await updateLegalInformation(updateData, token);

      if (response.success) {
        toast.success(response.message || "Legal information updated successfully");
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

  // Handle input changes
  const handleInputChange = (field: keyof PersonalInformation, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  return (
    <Tabs defaultValue="personal" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="account">Legal information </TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      {/* Personal Information */}
      <TabsContent value="personal" className="space-y-6">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Page 1: Basic Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Personal Information</CardTitle>
                <CardDescription>Update your personal details and identification information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formatDateForInput(formData.dob)}
                      onChange={(e) => handleInputChange("dob", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality || ""}
                      onChange={(e) => handleInputChange("nationality", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_id_number">Passport ID Number</Label>
                    <Input
                      id="passport_id_number"
                      value={formData.passport_id_number || ""}
                      onChange={(e) => handleInputChange("passport_id_number", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_number">Tax Number</Label>
                    <Input
                      id="tax_number"
                      value={formData.tax_number || ""}
                      onChange={(e) => handleInputChange("tax_number", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="other_id_number">Other ID Number</Label>
                    <Input
                      id="other_id_number"
                      value={formData.other_id_number || ""}
                      onChange={(e) => handleInputChange("other_id_number", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin_code">PIN Code</Label>
                    <Input
                      id="pin_code"
                      value={formData.pin_code || ""}
                      onChange={(e) => handleInputChange("pin_code", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page 2: Location and Status Information */}
            <Card>
              <CardHeader>
                <CardTitle>Location and Status Information</CardTitle>
                <CardDescription>Update your employment status, client type, and location details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Employment Status</Label>
                    <Select
                      value={formData.employment_status || ""}
                      onValueChange={(value) => handleInputChange("employment_status", value || null)}
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
                      value={formData.client_type || ""}
                      onValueChange={(value) => handleInputChange("client_type", value || "")}
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
                      value={String(formData.country || "")}
                      onChange={(e) => handleInputChange("country", e.target.value || "")}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state || ""}
                      onChange={(e) => handleInputChange("state", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => handleInputChange("city", e.target.value || null)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your full address..."
                      value={formData.address || ""}
                      onChange={(e) => handleInputChange("address", e.target.value || null)}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {!loading && (
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
        )}
      </TabsContent>

      {/* Legal Information */}
      <TabsContent value="account" className="space-y-6">
        {loadingLegalInfo ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
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
                    checked={legalInfo.politically_exposed}
                    onCheckedChange={(checked) =>
                      setLegalInfo((prev) => ({ ...prev, politically_exposed: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {legalInfo.politically_exposed ? "Yes" : "No"}
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
                  value={legalInfo.annual_income || ""}
                  onChange={(e) =>
                    setLegalInfo((prev) => ({
                      ...prev,
                      annual_income: parseFloat(e.target.value) || 0,
                    }))
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
                  value={legalInfo.source_of_income}
                  onChange={(e) =>
                    setLegalInfo((prev) => ({ ...prev, source_of_income: e.target.value }))
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
                  value={legalInfo.estimated_net_worth || ""}
                  onChange={(e) =>
                    setLegalInfo((prev) => ({
                      ...prev,
                      estimated_net_worth: parseFloat(e.target.value) || 0,
                    }))
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
                  value={legalInfo.purpose_of_opening_account}
                  onChange={(e) =>
                    setLegalInfo((prev) => ({ ...prev, purpose_of_opening_account: e.target.value }))
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
                  value={legalInfo.estimated_annual_amount || ""}
                  onChange={(e) =>
                    setLegalInfo((prev) => ({
                      ...prev,
                      estimated_annual_amount: parseFloat(e.target.value) || 0,
                    }))
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
        )}
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
                  <Label className="text-base">Password</Label>
                  <p className="text-muted-foreground text-sm">Last changed 3 months ago</p>
                </div>
                <Button variant="outline">
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-muted-foreground text-sm">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                    Enabled
                  </Badge>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Login Notifications</Label>
                  <p className="text-muted-foreground text-sm">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Active Sessions</Label>
                  <p className="text-muted-foreground text-sm">
                    Manage devices that are logged into your account
                  </p>
                </div>
                <Button variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  View Sessions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notification Settings */}
      <TabsContent value="notifications" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose what notifications you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-muted-foreground text-sm">Receive notifications via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-muted-foreground text-sm">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Marketing Emails</Label>
                  <p className="text-muted-foreground text-sm">
                    Receive emails about new features and updates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Weekly Summary</Label>
                  <p className="text-muted-foreground text-sm">
                    Get a weekly summary of your activity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Security Alerts</Label>
                  <p className="text-muted-foreground text-sm">
                    Important security notifications (always enabled)
                  </p>
                </div>
                <Switch checked disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
