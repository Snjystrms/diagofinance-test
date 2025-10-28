'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Clock, Mail, User, Shield } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ data?: string }>
}

interface VerificationData {
  message: string;
  user: {
    name: string;
    username: string;
    email: string;
  };
  status: string;
  nextSteps: string[];
}

export default function VerificationSuccessPage({ searchParams }: PageProps) {
  const resolved = use(searchParams);
  const data: VerificationData | null = resolved?.data 
    ? JSON.parse(decodeURIComponent(resolved.data))
    : null;

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex">
        {/* Left side - Background Image */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Verification success background"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Right side - Content */}
        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Verification Successful!
              </h1>
              
              <p className="text-muted-foreground text-lg">
                Your email and payment have been verified successfully.
              </p>
            </div>

            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl text-green-800">What's Next?</CardTitle>
                <CardDescription className="text-base">
                  Your registration is now pending admin approval
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* User Info */}
                {data?.user && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">User Details</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{data.user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-medium">{data.user.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium break-all">{data.user.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Next Steps</span>
                  </div>
                  <div className="space-y-2">
                    {data?.nextSteps?.map((step, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    )) || (
                      <>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">Your email has been verified</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">Your payment has been verified</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">Your registration is now pending admin approval</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">You will receive notification once approved</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      <strong>Important:</strong> Please wait for admin approval. You'll receive an email notification once your account is approved.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/login">
                      <Mail className="h-4 w-4 mr-2" />
                      Back to Login
                    </Link>
                  </Button>
                </div>

                {/* Additional help */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Need help? Contact our support team for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
