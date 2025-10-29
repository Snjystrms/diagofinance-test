'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Custom Alert component since it doesn't exist in the project
interface AlertProps {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
  className?: string;
}

const Alert = ({ variant = 'default', children, className = '' }: AlertProps) => {
  const variantClasses = variant === 'destructive' 
    ? 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
    : 'border-border';
    
  return (
    <div 
      className={`rounded-lg border p-4 text-sm ${variantClasses} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {children}
      </div>
    </div>
  );
};

const AlertDescription = ({ children }: { children: React.ReactNode }) => {
  return <div className="text-sm [&_p]:leading-relaxed">{children}</div>;
};

interface TwoFactorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2FAEnabled: boolean;
  onStatusChange: () => void;
}

interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  instructions: string[];
  testToken: string;
}

export function TwoFactorModal({ 
  open, 
  onOpenChange, 
  is2FAEnabled,
  onStatusChange
}: TwoFactorModalProps) {
  const { user, token } = useAuth();
  const [step, setStep] = useState<'setup' | 'verify' | 'disable'>('setup');
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset modal state when it opens/closes
  useEffect(() => {
    if (open) {
      if (is2FAEnabled) {
        setStep('disable');
      } else {
        setStep('setup');
        loadSetupData();
      }
      setVerificationCode('');
      setError('');
    } else {
      // Reset to initial state when closing
      setStep('setup');
      setSetupData(null);
      setVerificationCode('');
      setError('');
    }
  }, [open, is2FAEnabled]);

  const loadSetupData = async () => {
    if (!user?.id || !token) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await authApi.setupTwoFactor(Number(user.id), token);
      
      if (response.success && response.data) {
        setSetupData({
          secret: response.data.secret,
          qrCode: response.data.qrCode,
          instructions: response.data.instructions,
          testToken: response.data.testToken
        });
      } else {
        setError(response.message || 'Failed to load 2FA setup data');
      }
    } catch (err) {
      setError('Failed to load 2FA setup data');
      console.error('2FA setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!user?.id || !token || !verificationCode) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await authApi.verifyAndEnableTwoFactor(
        {
          user_id: Number(user.id),
          token: verificationCode
        },
        token
      );
      
      if (response.success) {
        toast.success('2FA enabled successfully');
        onStatusChange();
        onOpenChange(false);
      } else {
        setError(response.message || 'Failed to enable 2FA');
      }
    } catch (err) {
      setError('Failed to enable 2FA');
      console.error('2FA enable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user?.id || !token) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await authApi.disableTwoFactor(Number(user.id), token);
      
      if (response.success) {
        toast.success('2FA disabled successfully');
        onStatusChange();
        onOpenChange(false);
      } else {
        setError(response.message || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to disable 2FA');
      console.error('2FA disable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'setup' && 'Enable Two-Factor Authentication'}
            {step === 'verify' && 'Verify Two-Factor Authentication'}
            {step === 'disable' && 'Disable Two-Factor Authentication'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'setup' && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : setupData ? (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with Google Authenticator app
                  </p>
                  
                  <div className="flex justify-center mb-4">
                    <img 
                      src={setupData.qrCode} 
                      alt="2FA QR Code" 
                      className="border rounded-lg p-2"
                    />
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg mb-4">
                    <p className="text-xs font-mono break-all">
                      {setupData.secret}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save this secret key in a secure place
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Instructions:</h4>
                  <ul className="text-xs space-y-1">
                    {setupData.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => setStep('verify')}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
        
        {step === 'verify' && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              
              <div className="flex justify-center">
                <div className="w-40">
                  <Label htmlFor="verification-code" className="sr-only">
                    Verification Code
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('setup')}
              >
                Back
              </Button>
              <Button 
                onClick={handleEnable2FA}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? 'Enabling...' : 'Enable 2FA'}
              </Button>
            </div>
          </div>
        )}
        
        {step === 'disable' && (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center py-4">
              <ShieldX className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Are you sure you want to disable two-factor authentication?
                This will reduce the security of your account.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={isLoading}
              >
                {isLoading ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}