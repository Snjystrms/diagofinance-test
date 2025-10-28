'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
