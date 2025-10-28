import TransactionVerification from '@/components/transaction-verification';

export default function TransactionVerificationPage() {
  return (
    <div>
      <TransactionVerification 
        verificationCode="41539452"
        transactionHash="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
        network="BNB Smart Chain"
        amount="30 USDT (BEP20)"
        address="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
      />
    </div>
  );
} 