import TransactionVerification from '@/components/transaction-verification';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    verificationcode?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function TransactionVerificationDynamicPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Extract verification code from different sources
  let verificationCode = "41539452"; // default
  
  // First try to get from search params
  if (resolvedSearchParams.verificationcode) {
    verificationCode = Array.isArray(resolvedSearchParams.verificationcode) 
      ? resolvedSearchParams.verificationcode[0] 
      : resolvedSearchParams.verificationcode;
  }
  // Then try to get from URL slug
  else if (resolvedParams.slug && resolvedParams.slug.length > 0) {
    verificationCode = resolvedParams.slug[0];
  }
  
  // Extract additional parameters if they exist
  const additionalParams = resolvedParams.slug?.slice(1) || [];
  
  console.log('URL Parameters:', {
    slug: resolvedParams.slug,
    searchParams: resolvedSearchParams,
    verificationCode,
    additionalParams
  });
  
  return (
    <div>
      <TransactionVerification 
        verificationCode={verificationCode}
        transactionHash="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
        network="BNB Smart Chain"
        amount="30 USDT (BEP20)"
        address="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
      />
    </div>
  );
} 