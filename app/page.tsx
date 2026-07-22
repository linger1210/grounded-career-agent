import type { Metadata } from "next";
import { getChatGPTUser } from "./chatgpt-auth";
import CareerAgent from "./CareerAgent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Grounded — Realistic AI career guidance" },
  description: "Find better-fit jobs, understand salary and seniority, and prepare truthful applications with evidence behind every recommendation.",
};

export default async function Home() {
  const signedInUser = await getChatGPTUser();
  return <CareerAgent signedInName={signedInUser?.displayName ?? null} />;
}
