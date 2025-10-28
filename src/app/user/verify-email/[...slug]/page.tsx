import TransactionVerification from '@/components/transaction-verification';

interface PageProps {
  params: {
    slug: string[];
  };
  searchParams: {
    verificationcode?: string;
    [key: string]: string | string[] | undefined;
  };
}

export default function TransactionVerificationDynamicPage({ params, searchParams }: PageProps) {
  // Extract verification code from different sources
  let verificationCode = "41539452"; // default
  
  // First try to get from search params
  if (searchParams.verificationcode) {
    verificationCode = Array.isArray(searchParams.verificationcode) 
      ? searchParams.verificationcode[0] 
      : searchParams.verificationcode;
  }
  // Then try to get from URL slug
  else if (params.slug && params.slug.length > 0) {
    verificationCode = params.slug[0];
  }
  
  // Extract additional parameters if they exist
  const additionalParams = params.slug?.slice(1) || [];
  
  console.log('URL Parameters:', {
    slug: params.slug,
    searchParams,
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