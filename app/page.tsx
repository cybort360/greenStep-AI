import { ChatWidget } from "@/components/ChatWidget";
import { ImpactDashboard } from "@/components/ImpactDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <ImpactDashboard />
      <ChatWidget />
      <ThemeToggle />
    </main>
  );
}
