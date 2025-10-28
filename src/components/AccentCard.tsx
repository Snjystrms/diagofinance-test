// components/AccentCard.tsx
import { withAlpha } from "@/utils/accent";

type AccentCardProps = {
  color: string;               // hex, e.g. "#8B5CF6"
  children: React.ReactNode;
  className?: string;
};

// Tailwind handles layout; inline style injects dynamic color/alpha
export function AccentCard({ color, children, className }: AccentCardProps) {
  return (
    <div
      className="relative rounded-xl p-[1px]" // this acts like the border thickness
      style={{height: "fit-content",
        backgroundImage: `linear-gradient(90deg, ${withAlpha(color,0)}, ${withAlpha(color,0)})`,
      }}
    >
      <div
        className={`rounded-xl p-4 ${className ?? ""}`}
        style={{
          border: `1px solid ${withAlpha(color,0.5)}`,                     // colored border (50% opacity)
          backgroundImage: `linear-gradient(180deg, ${withAlpha(color,0.14)}, ${withAlpha(color,0.04)})`, // soft inner wash
          backgroundColor: "rgba(32,32,32,0.12)",                           // subtle dark base (optional)
        }}
      >
        {children}
      </div>
    </div>
  );
}
