'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GroupedPermissions, API_BASE_URL, AUTH_TOKEN_REFRESH_INTERVAL_MS, refreshCurrentAuthToken } from '@/lib/api';
import { Permission } from '@/types/permissions';
import toast from 'react-hot-toast';

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

    try {
      isRefreshingRef.current = true;
      console.log('🔄 Refreshing auth token...');
      
      const newToken = await refreshCurrentAuthToken(token);
      
      if (newToken) {
        // Update token in state and localStorage
        setToken(newToken);
        localStorage.setItem('auth_token', newToken);
        
        console.log('✅ Token refreshed successfully');
        return true;
      } else {
        console.error('❌ Token refresh failed: Invalid response');
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      
      // If refresh fails with 401, logout user
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        console.log('Token refresh returned 401 - logging out');
        toast.error('Session expired. Please login again.');
        logout();
        window.location.href = '/login';
      }
      
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

  // Load auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Immediately restore session for better UX
          setToken(storedToken);
          setUser(userData);
          setIsAuthenticated(true);
          setIsLoading(false);
          
          // Validate token in background without blocking UI
          // setTimeout(async () => {
          //   const { isValid, shouldLogout } = await validateToken(storedToken, userData?.type);
          //   
          //   if (shouldLogout) {
          //     console.log('Token validation failed during initialization - logging out');
          //     // Clear stored data and logout
          //     localStorage.removeItem('auth_token');
          //     localStorage.removeItem('auth_user');
          //     setToken(null);
          //     setUser(null);
          //     setIsAuthenticated(false);
          //     // Redirect to login page
          //     window.location.href = '/login';
          //   } else if (isValid) {
          //     console.log('Token validation successful for', userData?.type);
          //   } else {
          //     console.log('Token validation inconclusive for', userData?.type, '- keeping session');
          //   }
          // }, 100); // Small delay to avoid blocking initial render
          
        } catch (error) {
          console.error('Error parsing stored auth data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
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
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const setUserData = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('auth_user');
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

    console.log('Setting up token auto-refresh (every 30 minutes)');
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
