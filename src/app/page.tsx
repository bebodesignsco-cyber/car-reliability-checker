import type { Metadata } from "next";
import { SelectorPanel } from "@/components/selector-panel";

export const metadata: Metadata = {
  title: "Car Reliability",
  description:
    "Generation-level trust scores, engine picks, and platform risks to help you buy used cars with confidence.",
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 md:py-16">
      <header className="border-b-2 border-foreground pb-8">
        <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
          THE AUTO RELIABILITY ENGINE.
        </h1>
      </header>

      <SelectorPanel />
    </main>
  );
}
