import toast from "react-hot-toast";

export const toastNoDownline = (who?: string) =>
  toast(who ? `No downline members under ${who}.` : `No downline members.`, {
    icon: "📭",
  });

export const NODE_W = 220;
export const NODE_H = 90;

export const levelColor = (level: number | string = 1) => {
  const levelNum = typeof level === "string" ? parseInt(level.replace("Level-", "")) || 0 : level;
  const map: Record<number, string> = {
    0: "#0ea5e9",
    1: "#2563eb",
    2: "#7c3aed",
    3: "#9333ea",
    4: "#db2777",
    5: "#ea580c",
    6: "#ca8a04",
    7: "#16a34a",
    8: "#0891b2",
    9: "#0ea5e9",
    10: "#0ea5e9",
  };
  return map[levelNum] ?? "#2563eb";
};

export const levelToDepth = (level: string): number => {
  if (level === "IB") return 0;
  const match = level.match(/Level-(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

export const fmtNum = (n?: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtMoney = (n?: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );