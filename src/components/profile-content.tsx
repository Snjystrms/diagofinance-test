"use client";

import { Shield, Key, Trash2, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ProfileContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    jobTitle: "Senior Product Designer",
    company: "Acme Inc.",
    bio: "Passionate product designer with 8+ years of experience creating user-centered digital experiences. I love solving complex problems and turning ideas into beautiful, functional products.",
    location: "San Francisco, CA"
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      console.log("Saving changes:", formData);
      // Here you would typically make an API call to save the data
    }
    setIsEditing(!isEditing);
  };

  return (
    <Tabs defaultValue="personal" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      {/* Personal Information */}
      <TabsContent value="personal" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile information.</CardDescription>
            </div>
            <Button 
              onClick={handleEditToggle}
              variant={isEditing ? "default" : "outline"}
            >
              {isEditing ? "Save" : "Edit Profile"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input 
                  id="jobTitle" 
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Account Settings */}
      <TabsContent value="account" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences and subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Account Status</Label>
                <p className="text-muted-foreground text-sm">Your account is currently active</p>
              </div>
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                Active
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Subscription Plan</Label>
                <p className="text-muted-foreground text-sm">Pro Plan - $29/month</p>
              </div>
              <Button variant="outline">Manage Subscription</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Account Visibility</Label>
                <p className="text-muted-foreground text-sm">
                  Make your profile visible to other users
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Data Export</Label>
                <p className="text-muted-foreground text-sm">Download a copy of your data</p>
              </div>
              <Button variant="outline">Export Data</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Delete Account</Label>
                <p className="text-muted-foreground text-sm">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
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

      {/* Documents & KYC */}
      <TabsContent value="documents" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>KYC Verification</CardTitle>
            <CardDescription>Upload and manage your KYC documents for identity verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>KYC Status</Label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  <span className="text-sm text-muted-foreground">Complete your KYC verification to unlock all features</span>
                </div>
                <Progress value={40} className="h-2" />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Required Documents</h3>
                
                {/* ID Document */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">Government-issued ID</h4>
                          <p className="text-sm text-muted-foreground">Passport, Driver&apos;s License, or National ID</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Verified
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
                
                {/* Proof of Address */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">Proof of Address</h4>
                          <p className="text-sm text-muted-foreground">Utility bill or bank statement (not older than 3 months)</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Pending
                      </Badge>
                    </div>
                    <CardContent className="p-0 pt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Upload Document</Label>
                          <div className="flex items-center gap-2">
                            <Input type="file" className="max-w-sm" accept=".pdf,.jpg,.jpeg,.png" />
                            <Button variant="outline" size="sm">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Accepted formats: PDF, JPG, PNG (max 5MB)</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Document Type</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Select document type</option>
                            <option value="utility">Utility Bill</option>
                            <option value="bank">Bank Statement</option>
                            <option value="tax">Tax Document</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Issue Date</Label>
                          <Input type="date" className="max-w-xs" />
                        </div>
                      </div>
                    </CardContent>
                  </CardHeader>
                </Card>
                
                {/* Selfie Verification */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Selfie with ID</h4>
                          <p className="text-sm text-muted-foreground">Take a selfie while holding your ID document</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Not Started
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </div>
              
              <div className="rounded-lg p-4">
                <h4 className="mb-2 font-medium">Why we need these documents?</h4>
                <p className="text-sm text-muted-foreground">
                  We require these documents to verify your identity and comply with KYC (Know Your Customer) regulations. 
                  Your information is securely stored and encrypted.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t px-6 py-4">
            <Button>Save & Submit for Review</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}