'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, GroupedPermissions, AUTH_TOKEN_REFRESH_INTERVAL_MS, refreshCurrentAuthToken } from '@/lib/api';
import { Permission } from '@/types/permissions';
import toast from 'react-hot-toast';

const LOCAL_TOKEN_KEY = 'auth_token';
const LOCAL_USER_KEY = 'auth_user';
const SESSION_TOKEN_KEY = 'authToken';
const SESSION_USER_KEY = 'user';
const SESSION_ADMIN_FLAG_KEY = 'isAdminSession';

interface User {
  id: string | number;
  name?: string;
  email: string;
  type: 'admin' | 'user' | 'subadmin' | 'manager';
  mobile?: string;
  status?: boolean;
  requires_usdt_transaction?: boolean;
  sponsor_id?: string;
  role?: string;
  permissions?: Permission[];
  managerPermissions?: GroupedPermissions[];
  is_ib_user?: boolean;
}

interface AuthContextType {
  type: string;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const isAdminSessionActive = () =>
  typeof window !== 'undefined' &&
  sessionStorage.getItem(SESSION_ADMIN_FLAG_KEY) === 'true';

const clearAdminSessionStorage = () => {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_ADMIN_FLAG_KEY);
};

const normalizeClientProfileUser = (profileUser: {
  id?: string | number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  status?: boolean | number;
  requires_usdt_transaction?: boolean;
  sponsor_id?: string | null;
  is_ib_user?: boolean | number;
}): User | null => {
  if (!profileUser.id || !profileUser.email) return null;

  const fullName =
    profileUser.name ||
    [profileUser.first_name, profileUser.last_name].filter(Boolean).join(' ').trim();

  return {
    id: profileUser.id,
    name: fullName || undefined,
    email: profileUser.email,
    type: 'user',
    mobile: profileUser.mobile || undefined,
    status:
      typeof profileUser.status === 'number'
        ? Boolean(profileUser.status)
        : profileUser.status,
    requires_usdt_transaction: profileUser.requires_usdt_transaction,
    sponsor_id: profileUser.sponsor_id || undefined,
    is_ib_user:
      typeof profileUser.is_ib_user === 'number'
        ? Boolean(profileUser.is_ib_user)
        : profileUser.is_ib_user,
  };
};

const cleanAdminTokenFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('adminToken');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl || '/dashboard');
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = React.useRef(false);
  const isRefreshingRef = React.useRef(false);

  // Refresh token function
  const refreshAuthToken = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh calls
    if (isRefreshingRef.current || !token || !isAuthenticated) {
      return false;
    }

    // Don't refresh tokens from admin sessions (they should be temporary)
    if (isAdminSessionActive()) {
      console.log('Skipping token refresh for admin-initiated session');
      return false;
    }

    try {
      isRefreshingRef.current = true;
      
      const newToken = await refreshCurrentAuthToken(token);
      
      if (newToken && newToken !== token) {
        // Update token in state and localStorage only if we got a new token.
        setToken(newToken);
        localStorage.setItem(LOCAL_TOKEN_KEY, newToken);
        return true;
      } else if (newToken === token) {
        // Refresh returned the same token (refresh endpoint returned 401)
        // Keep using the old token - don't logout yet
        console.warn('Token refresh returned 401 - continuing with existing token');
        return false;
      } else {
        console.error('Token refresh failed: Invalid response');
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [token, isAuthenticated]);

  // Validate token with server (role-based endpoints)
  /*
  const validateToken = async (authToken: string, userType?: string, retries = 2): Promise<{ isValid: boolean; shouldLogout: boolean }> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let endpoint: string;
        
        // Determine the appropriate endpoint based on user type
        switch (userType?.toLowerCase()) {
          case 'admin':
            // For admin, use a safe admin endpoint that validates the token
            endpoint = `/admin/subadmins/list`;
            break;
          case 'subadmin':
            // For subadmin, use the permissions endpoint
            endpoint = `/permissions/subadmin/permissions`;
            break;
          case 'user':
          default:
            // For regular users, use the profile endpoint
            endpoint = `/user/profile/view`;
            break;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // Parse the response to ensure it has the expected structure
          const json = await response.json();
          
          // Check if the response indicates token expiration or invalidity
          if (json?.success === false && (json?.message?.toLowerCase().includes('token expired') || json?.message?.toLowerCase().includes('invalid token'))) {
            console.log('Token expired or invalid detected in response for', userType);
            return { isValid: false, shouldLogout: true };
          }
          
          // Validate response structure based on user type
          let hasValidStructure = false;
          switch (userType?.toLowerCase()) {
            case 'admin':
              // Admin endpoint should return success and data
              hasValidStructure = json?.success === true || json?.data !== undefined;
              break;
            case 'subadmin':
              // Subadmin endpoint should return permissions data
              hasValidStructure = json?.success === true && json?.data?.permissions !== undefined;
              break;
            case 'user':
            default:
              // User endpoint should return user data
              hasValidStructure = json?.user?.id !== undefined;
              break;
          }
          
          if (hasValidStructure) {
            return { isValid: true, shouldLogout: false };
          } else {
            console.warn('Token validation: Invalid response structure for', userType);
            return { isValid: false, shouldLogout: true };
          }
        }
        
        // Parse response body even for non-200 status codes to check for token expiration
        try {
          const json = await response.json();
          if (json?.success === false && (json?.message?.toLowerCase().includes('token expired') || json?.message?.toLowerCase().includes('invalid token'))) {
            console.log('Token expired or invalid detected in error response for', userType, ':', json.message);
            return { isValid: false, shouldLogout: true };
          }
        } catch (parseError) {
          console.warn('Could not parse error response body:', parseError);
        }
        
        // Explicit authentication errors - token is invalid
        if (response.status === 401 || response.status === 403) {
          console.log('Token authentication failed:', response.status, 'for', userType);
          return { isValid: false, shouldLogout: true };
        }
        
        // Other server errors - don't logout, might be temporary
        if (attempt === retries) {
          console.warn('Token validation failed with server error:', response.status, 'for', userType, 'but keeping session');
          return { isValid: false, shouldLogout: false };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        
      } catch (error) {
        console.error(`Token validation attempt ${attempt + 1} failed for ${userType}:`, error);
        
        // On final attempt, don't logout due to network errors
        if (attempt === retries) {
          console.warn('Token validation failed due to network error for', userType, 'but keeping session');
          return { isValid: false, shouldLogout: false };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    return { isValid: false, shouldLogout: false };
  };
  */

  const validateToken = async (
    _authToken: string,
    _userType?: string,
    _retries = 2
  ): Promise<{ isValid: boolean; shouldLogout: boolean }> => {
    console.warn('validateToken temporarily disabled');
    return { isValid: true, shouldLogout: false };
  };

  // Load auth state from sessionStorage first, then localStorage.
  useEffect(() => {
    const initializeAuth = async () => {
      const adminToken = new URLSearchParams(window.location.search).get('adminToken');

      if (adminToken) {
        try {
          sessionStorage.setItem(SESSION_TOKEN_KEY, adminToken);
          sessionStorage.setItem(SESSION_ADMIN_FLAG_KEY, 'true');

          const profileResponse = await authApi.getProfileView(adminToken);
          const rawUser = profileResponse.data?.user ?? {};
          let clientUser = normalizeClientProfileUser(rawUser);

          if (!clientUser) {
            throw new Error('Client profile response did not include a valid user');
          }

          console.log('[AUTH] Admin session - Profile user data:', {
            raw_is_ib_user: (rawUser as { is_ib_user?: boolean | number }).is_ib_user,
            normalized_is_ib_user: clientUser.is_ib_user,
          });

          // If is_ib_user is not set, check IB status via API
          if (clientUser.is_ib_user === undefined || clientUser.is_ib_user === null) {
            try {
              const { ibRequestsApi } = await import('@/lib/api');
              const ibStatusResponse = await ibRequestsApi.getStatus(adminToken);
              if (ibStatusResponse?.data) {
                const isIbUser = 
                  ibStatusResponse.data.is_ib_user === true || 
                  ibStatusResponse.data.is_ib_user === 1 ||
                  (ibStatusResponse.data.ib_request?.status === 1);
                
                clientUser = { ...clientUser, is_ib_user: isIbUser };
                console.log('[AUTH] Fetched IB status from API:', { is_ib_user: isIbUser });
              }
            } catch (ibError) {
              console.warn('[AUTH] Failed to fetch IB status:', ibError);
            }
          }

          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(clientUser));
          setToken(adminToken);
          setUser(clientUser);
          setIsAuthenticated(true);
          console.log('Admin-initiated client session loaded from URL token', { is_ib_user: clientUser.is_ib_user });
        } catch (error) {
          console.error('Failed to initialize admin-initiated client session:', error);
          clearAdminSessionStorage();
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          toast.error('Unable to open client session. Please try again from the admin portal.');
        } finally {
          cleanAdminTokenFromUrl();
          setIsLoading(false);
        }
        return;
      }

      const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
      const hasCompleteAdminSession =
        sessionStorage.getItem(SESSION_ADMIN_FLAG_KEY) === 'true' &&
        Boolean(sessionToken) &&
        Boolean(sessionUser);

      const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY);
      const storedUser = localStorage.getItem(LOCAL_USER_KEY);

      const activeToken = hasCompleteAdminSession ? sessionToken : storedToken;
      const activeUserStr = hasCompleteAdminSession ? sessionUser : storedUser;

      if (activeToken && activeUserStr) {
        try {
          const userData = JSON.parse(activeUserStr);
          
          // Immediately restore session for better UX
          setToken(activeToken);
          setUser(userData);
          setIsAuthenticated(true);
          setIsLoading(false);
          
          if (hasCompleteAdminSession) {
            console.log('Admin-initiated client session loaded from sessionStorage', { 
              is_ib_user: userData.is_ib_user,
              userData 
            });
          } else {
            console.log('Regular user session loaded from localStorage', { 
              is_ib_user: userData.is_ib_user,
              userData 
            });
          }
          
        } catch (error) {
          console.error('Error parsing stored auth data:', error);
          localStorage.removeItem(LOCAL_TOKEN_KEY);
          localStorage.removeItem(LOCAL_USER_KEY);
          clearAdminSessionStorage();
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem(LOCAL_TOKEN_KEY, authToken);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userData));
  };

  useEffect(() => {
    const handleTokenRefresh = (event: Event) => {
      const newToken = (event as CustomEvent<{ token?: string }>).detail?.token;
      if (newToken) {
        setToken(newToken);
        setIsAuthenticated(true);
      }
    };

    window.addEventListener('auth-token-refreshed', handleTokenRefresh);
    return () => {
      window.removeEventListener('auth-token-refreshed', handleTokenRefresh);
    };
  }, []);

  const logout = () => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    if (isAdminSessionActive()) {
      clearAdminSessionStorage();
    } else {
      localStorage.removeItem(LOCAL_TOKEN_KEY);
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  };

  const setUserData = (userData: User | null) => {
    setUser(userData);
    if (isAdminSessionActive()) {
      if (userData) {
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userData));
      } else {
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    } else if (userData) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  };

  // Method for pages to validate session and auto-logout on token expiration
  const validateSession = async (): Promise<boolean> => {
    if (!token || !user) {
      return false;
    }

    // const { isValid, shouldLogout } = await validateToken(token, user.type);
    // 
    // if (shouldLogout) {
    //   console.log('Session validation failed - logging out user');
    //   logout();
    //   // Redirect to login page
    //   window.location.href = '/login';
    //   return false;
    // }
    
    return true;
  };

  // Global session validation function
  const performGlobalValidation = useCallback(async () => {
    // Prevent concurrent validations
    if (isValidatingRef.current || !isAuthenticated || !token) {
      return;
    }

    try {
      isValidatingRef.current = true;
      await validateSession();
    } catch (error) {
      console.error('Global session validation error:', error);
    } finally {
      isValidatingRef.current = false;
    }
  }, [isAuthenticated, token]);

  // Set up global session validation
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up periodic validation every 5 minutes
    intervalRef.current = setInterval(performGlobalValidation, 300000);

    // Validate on window focus
    const handleFocus = () => {
      performGlobalValidation();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, token, performGlobalValidation]);

  // Set up token auto-refresh every 30 minutes
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Clear any existing refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }
    let lastRefreshTime = Date.now();

    refreshIntervalRef.current = setInterval(() => {
      refreshAuthToken().then(success => {
        if (success) {
          lastRefreshTime = Date.now();
        }
      });
    }, AUTH_TOKEN_REFRESH_INTERVAL_MS);

    // Also refresh on window focus if the scheduled refresh window has elapsed.
    const handleFocusRefresh = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      if (timeSinceLastRefresh > AUTH_TOKEN_REFRESH_INTERVAL_MS) {
        refreshAuthToken().then(success => {
          if (success) {
            lastRefreshTime = Date.now();
          }
        });
      }
    };

    window.addEventListener('focus', handleFocusRefresh);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [isAuthenticated, token, refreshAuthToken]);

  const value: AuthContextType = {
    type: user?.type ?? 'user',
    user,
    token,
    isAuthenticated,
    login,
    logout,
    setUser: setUserData,
    validateSession,
  };

  // Show loading spinner while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 