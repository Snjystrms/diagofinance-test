"use client";

import Image from "next/image";

interface LogoCubeProps {
  size?: number;
  logoSrc?: string;
  alt?: string;
  duration?: number;
}

export function LogoCube({
  size = 80,
  logoSrc = "/diagologo.svg",
  alt = "Vinnexia",
  duration = 10,
}: LogoCubeProps) {
  const translateZ = `${size / 2}px`;
  const faces = [
    { transform: "rotateY(0deg)", shade: "from-white/10 to-transparent" },
    { transform: "rotateY(90deg)", shade: "from-black/10 to-transparent" },
    { transform: "rotateY(180deg)", shade: "from-black/20 to-transparent" },
    { transform: "rotateY(270deg)", shade: "from-black/10 to-transparent" },
    { transform: "rotateX(90deg)", shade: "from-white/20 to-transparent" },
    { transform: "rotateX(-90deg)", shade: "from-black/30 to-transparent" },
  ];

  return (
    <div
      className="relative flex w-full items-center justify-center [perspective:1000px]"
      style={{ height: size * 2.2 }}
    >
      <div
        className="absolute rounded-full bg-primary/30 blur-2xl"
        style={{ width: size * 1.4, height: size * 0.5 }}
      />

      <div
        className="relative animate-[logo-cube-spin_var(--cube-duration)_linear_infinite] [transform-style:preserve-3d]"
        style={
          {
            width: size,
            height: size,
            "--cube-duration": `${duration}s`,
          } as React.CSSProperties
        }
      >
        {faces.map(({ transform, shade }) => (
          <div
            key={transform}
            className="ib-portal-surface-primary absolute inset-0 flex items-center justify-center rounded-2xl border bg-card/95 backdrop-blur-sm [backface-visibility:hidden]"
            style={{ transform: `${transform} translateZ(${translateZ})` }}
          >
            <div
              className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${shade}`}
            />
            <Image
              src={logoSrc}
              alt={alt}
              width={size * 0.4}
              height={size * 0.4}
              className="relative z-10 drop-shadow-md"
              priority
            />
          </div>
        ))}
      </div>
    </div>
  );
}