export type KycPhase = "draft" | "under_review" | "approved";

export const isImageName = (name?: string | null) =>
  !!name && /\.(png|jpe?g)$/i.test(name);

export const isPdfName = (name?: string | null) =>
  !!name && /\.pdf$/i.test(name);
