'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredLoadingSurface } from '@/components/loading/page-loading-skeleton';
import { useAuth } from '@/contexts/auth-context';

export function HomeRedirectClient() {
  const user= useAuth();
  const router = useRouter();


  useEffect(() => {
    console.log(user,"user");
    if (user.isAuthenticated ) {
      if(user.type==="user" && !user.is_account_active){
        router.push('/test-registration-fee');
      }else{
        console.log("user is not active");
        router.push('/dashboard');
      }
 
    } else {
      router.push('/login');
    }
  }, [user.isAuthenticated, router]);

  return (
    <CenteredLoadingSurface
      minHeightClassName="min-h-screen"
      title="Loading"
      description="Preparing your CRM workspace."
    />
  );
}
