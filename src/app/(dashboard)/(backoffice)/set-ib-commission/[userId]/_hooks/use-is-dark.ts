"use client";

import { useEffect, useState } from "react";

export function useIsDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark") || mq.matches);

    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", check);

    return () => {
      obs.disconnect();
      mq.removeEventListener("change", check);
    };
  }, []);

  return isDark;
}
