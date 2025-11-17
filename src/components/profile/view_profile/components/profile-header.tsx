"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MapPin, Shield, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileHeader() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await authApi.getProfileView(token);
        
        if (response.success && response.data) {
          setProfileData(response.data);
          setIs2FAEnabled(response.data.user?.google_2FA_status || false);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  // Listen for 2FA status changes from profile-content
  useEffect(() => {
    const handle2FAStatusChange = async () => {
      if (!token) return;
      
      try {
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          setProfileData(response.data);
          setIs2FAEnabled(response.data.user?.google_2FA_status || false);
        }
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    };

    window.addEventListener('2fa-status-changed', handle2FAStatusChange);
    
    return () => {
      window.removeEventListener('2fa-status-changed', handle2FAStatusChange);
    };
  }, [token]);

  const handleCopyAccountId = () => {
    if (profileData?.user?.account_id) {
      navigator.clipboard.writeText(profileData.user.account_id);
      setCopiedAccountId(true);
      toast.success("Account ID copied to clipboard");
      setTimeout(() => setCopiedAccountId(false), 2000);
    }
  };


  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileData?.user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  const user = profileData.user;
  const initials = user.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-gray-200 dark:border-gray-700">
              <AvatarImage src={`https://bundui-images.netlify.app/avatars/08.png`} alt={user.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {user.verification_status === "pending" && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-orange-500 p-1">
                <div className="h-3 w-3 rounded-full bg-white"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user.name || user.email}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Account ID */}
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Account ID: {user.account_id}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  onClick={handleCopyAccountId}
                >
                  {copiedAccountId ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Contact Number */}
              {user.mobile && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    +{user.country_code} {user.mobile}
                  </span>
                </div>
              )}

              {/* Location */}
              {user.location && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {user.location}
                  </span>
                </div>
              )}

              {/* 2FA Status */}
              <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 ${
                is2FAEnabled 
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
              }`}>
                <Shield className={`h-4 w-4 ${
                  is2FAEnabled 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`} />
                <span className={`text-sm font-medium ${
                  is2FAEnabled 
                    ? "text-green-700 dark:text-green-300" 
                    : "text-red-700 dark:text-red-300"
                }`}>
                  {is2FAEnabled ? "Secured with 2FA" : "2FA Not Enabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
