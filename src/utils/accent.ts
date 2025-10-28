// utils/accent.ts
export const ACCENT_COLORS = [
    "#8B5CF6", // purple
    "#06B6D4", // cyan
    "#00B503", // green
    "#F97316", // orange
    "#EC4899", // pink
    "#3B82F6", // blue
    "#F59E0B", // amber
  ];
  
  export const withAlpha = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  