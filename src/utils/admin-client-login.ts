/**
 * Utility for admin to login as a client and redirect to the client portal
 */

import { authApi } from "@/lib/api-auth-admin";
import type { ApiResponse } from "@/lib/api-core";
import type { LoginResponse } from "@/lib/api-auth-admin";

export interface AdminLoginAsClientOptions {
  userId: number;
  email: string;
  password: string;
  adminToken: string;
}

export interface AdminLoginAsClientResult {
  success: boolean;
  requires2FA?: boolean;
  redirectUrl?: string;
  clientToken?: string;
  error?: string;
}

type LoginLikeResponse = ApiResponse<LoginResponse> & {
  token?: string;
  requires_2fa?: boolean;
  data?: LoginResponse;
};

function extractLoginToken(response: LoginLikeResponse): string | null {
  const token = response.token || response.data?.token;
  return typeof token === "string" && token.trim() ? token : null;
}

/**
 * Determines the client portal URL based on the current environment
 */
export function getClientPortalUrl(): string {
  // Check if we're in development mode
  if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
    // Use localhost with the appropriate port
    return `http://localhost:${window.location.port || 3000}`;
  }

  // In production, determine the client portal URL
  const currentHost = window.location.hostname;
  
  // If we're on admin.vinnexiacapital.com, redirect to user.vinnexiacapital.com
  if (currentHost === "admin.vinnexiacapital.com") {
    return "https://user.vinnexiacapital.com";
  }
  
  // If we're on admin.graybulls.com, redirect to user.graybulls.com
  if (currentHost === "admin.graybulls.com") {
    return "https://user.graybulls.com";
  }

  // Default fallback - use the current origin
  return window.location.origin;
}

/**
 * Login as a client and redirect to client portal
 * This function handles the authentication and sets up the session
 * Uses sessionStorage for admin-initiated sessions (isolated per tab)
 */
export async function adminLoginAsClient(
  options: AdminLoginAsClientOptions
): Promise<AdminLoginAsClientResult> {
  try {
    // Use credential-based login directly (adminLoginAsClient API endpoint doesn't exist)
    const response = await authApi.login({
      email: options.email,
      password: options.password,
    }) as LoginLikeResponse;
    
    const token = extractLoginToken(response);

    // Check if 2FA is required
    if (response?.requires_2fa || response?.data?.requires_2fa) {
      return {
        success: false,
        requires2FA: true,
        error: "This user has 2FA enabled. You need to provide the 2FA code.",
      };
    }

    // If login successful and we have a token
    if (token) {
      // DON'T store here - let the new tab handle it
      // We'll pass token via URL parameter
      
      // Get the client portal URL
      const clientPortalUrl = getClientPortalUrl();

      return {
        success: true,
        clientToken: token,
        redirectUrl: `${clientPortalUrl}/dashboard`,
      };
    }

    return {
      success: false,
      error: "Login failed: No token received",
    };
  } catch (error) {
    console.error("Admin login as client error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Verify 2FA code and complete login
 * Uses sessionStorage for admin-initiated sessions (isolated per tab)
 */
export async function adminLoginAsClientWith2FA(
  email: string,
  otp: string
): Promise<AdminLoginAsClientResult> {
  try {
    const response = (await authApi.verifyOtp({
      email,
      otp,
    })) as LoginLikeResponse;

    const token = extractLoginToken(response);

    if (token) {
      // DON'T store here - let the new tab handle it
      // We'll pass token via URL parameter

      // Get the client portal URL
      const clientPortalUrl = getClientPortalUrl();

      return {
        success: true,
        clientToken: token,
        redirectUrl: `${clientPortalUrl}/dashboard`,
      };
    }

    return {
      success: false,
      error: "2FA verification failed: No token received",
    };
  } catch (error) {
    console.error("Admin login as client with 2FA error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid 2FA code",
    };
  }
}

/**
 * Open client portal in a new window/tab with the client session
 * Passes token via URL parameter for the new tab to pick up
 */
export function openClientPortalInNewTab(redirectUrl: string, token: string): void {
  // Encode token for URL safety
  const encodedToken = encodeURIComponent(token);
  
  // Add token as URL parameter
  const urlWithToken = `${redirectUrl}?adminToken=${encodedToken}`;
  
  // Open in a new tab
  window.open(urlWithToken, "_blank", "noopener,noreferrer");
}
