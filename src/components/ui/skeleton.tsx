import { cn } from "@/lib/utils"

function Skeleton({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative isolate overflow-hidden rounded-md",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(180deg, var(--skeleton-base) 0%, var(--skeleton-base-strong) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.38)",
        ...style,
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.8s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, var(--skeleton-highlight) 45%, transparent 100%)",
        }}
      />
      {children}
    </div>
  )
}

export { Skeleton }
