import type { Metadata } from "next";
import { HomeRedirectClient } from "./_components/home-redirect-client";

export const metadata: Metadata = {
  title: "CRM Dashboard",
  description: "Route selector for the CRM dashboard.",
};

export default function HomePage() {
  return <HomeRedirectClient />;
}
