import Image from 'next/image';

export function AuthPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[26px] border border-border/80 bg-card/96 px-6 py-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)] backdrop-blur-sm">
        <Image
          src="/vinnexia-logo-dark.svg"
          alt="Vaspan"
          width={56}
          height={56}
          priority
          className="mx-auto"
        />
        <p className="mt-4 text-sm font-semibold tracking-[0.01em] text-foreground">Loading</p>
        <p className="mt-1.5 text-sm leading-6 text-foreground/78">Preparing your secure sign-in experience.</p>
      </div>
    </div>
  );
}