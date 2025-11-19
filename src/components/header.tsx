"use client"

import { useState, useEffect } from "react"
import { Bell, Search, User, LogOut, Palette, Shield, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { SidebarSelector } from "@/components/sidebar-selector"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { authApi, admin2FAApi, manager2FAApi } from "@/lib/api"
import toast from "react-hot-toast"
import { TwoFactorModal } from "@/components/two-factor-modal"

export function Header() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [sidebarSelectorOpen, setSidebarSelectorOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);

  // Check 2FA status when component mounts and when user changes
  useEffect(() => {
    if (user?.id && token) {
      checkTwoFactorStatus();
    }
  }, [user, token]);

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
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setIsLoading2FAStatus(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call the logout API if we have a token
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Even if the API call fails, we still want to log out locally
    } finally {
      // Perform local logout regardless of API success
      logout();
      router.push('/login');
      toast.success('You have been logged out successfully');
    }
  };

  const handle2FAStatusChange = () => {
    // Toggle the 2FA status and refresh the status from API
    checkTwoFactorStatus();
  };

  const handleSidebarTriggerClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-nested-sidebar"));
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="-ml-1" onClick={handleSidebarTriggerClick} />
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="relative md:hidden">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-60"
            />
          </div>
          
          {/* 2FA Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTwoFactorModalOpen(true)}
            disabled={isLoading2FAStatus}
            className="flex items-center gap-2"
          >
            {isLoading2FAStatus ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-sm">Loading...</span>
              </>
            ) : (
              <>
                <Shield className={`h-4 w-4 ${is2FAEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm hidden md:inline">
                  {is2FAEnabled ? "Secured with 2FA" : "Enable 2FA"}
                </span>
              </>
            )}
          </Button>
          
          {user?.type === 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarSelectorOpen(true)}
              title="Choose Sidebar Layout"
              className="relative"
            >
              <Layout className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setThemeCustomizerOpen(true)}
            title="Customize Theme"
            className="relative"
            style={{
              '--tw-ring-color': 'var(--accent, #3b82f6)',
            } as React.CSSProperties}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500"></span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@user" />
                  <AvatarFallback>
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile/view_profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <ThemeCustomizer 
          open={themeCustomizerOpen} 
          onOpenChange={setThemeCustomizerOpen} 
        />
        <SidebarSelector 
          open={sidebarSelectorOpen} 
          onOpenChange={setSidebarSelectorOpen} 
        />
      </header>
      
      <TwoFactorModal 
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        is2FAEnabled={is2FAEnabled}
        onStatusChange={handle2FAStatusChange}
      />
    </>
  )
}