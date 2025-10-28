# Transaction Verification Component

This component creates a beautiful transaction verification interface with a space-themed background, matching the design shown in the reference image.

## Features

- **Space-themed background** with planets, stars, and nebula effects
- **Transaction details display** including network, amount, and address
- **QR code placeholder** (generated pattern)
- **Verification form** with hashcode and transaction hash inputs
- **Copy-to-clipboard functionality** for the address
- **Responsive design** that works on all screen sizes
- **URL display** showing the verification path

## Usage

### Basic Usage

```tsx
import TransactionVerification from '@/components/transaction-verification';

export default function MyPage() {
  return (
    <TransactionVerification />
  );
}
```

### With Custom Props

```tsx
import TransactionVerification from '@/components/transaction-verification';

export default function MyPage() {
  return (
    <TransactionVerification 
      verificationCode="41539452"
      transactionHash="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
      network="BNB Smart Chain"
      amount="30 USDT (BEP20)"
      address="0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `verificationCode` | string | "489791" | The verification code to display |
| `transactionHash` | string | "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0" | The transaction hash |
| `network` | string | "BNB Smart Chain" | The blockchain network |
| `amount` | string | "30 USDT (BEP20)" | The transaction amount |
| `address` | string | "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0" | The wallet address |

## Routes

The component is accessible at:
- `/transaction-verification` - Main verification page
- Added to sidebar navigation with a Shield icon

## Styling

The component uses:
- **Tailwind CSS** for styling
- **Radix UI** components for form elements
- **Lucide React** for icons
- **Custom gradients** for the space background
- **Backdrop blur** effects for modern glass-morphism

## Background Elements

- **Stars**: Subtle star pattern overlay
- **Large Planet**: Blue-gray planet on the left
- **Small Moon**: Gray moon on the right
- **Nebula Effects**: Purple/pink/blue gradient overlays

## Form Functionality

- **Hashcode Input**: Pre-filled with verification code
- **Transaction Hash Input**: Pre-filled with transaction hash
- **Submit Button**: Logs form data to console (customizable)
- **Copy Button**: Copies address to clipboard

## Responsive Design

- **Desktop**: Two-column layout with side-by-side sections
- **Mobile**: Single-column layout with stacked sections
- **All screen sizes**: Proper spacing and typography scaling

## Customization

You can easily customize:
- Colors and gradients
- Background elements
- Form validation
- Submit handling
- QR code generation
- Styling and layout

## Dependencies

- `@/components/ui/*` - UI components
- `lucide-react` - Icons
- `react` - React hooks and state
- `tailwindcss` - Styling 