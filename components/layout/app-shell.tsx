import { Navbar } from "@/components/layout/navbar";
import { LearnerContextProvider } from "@/components/experience/learner-context-provider";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LearnerContextProvider>{children}</LearnerContextProvider>
    </div>
  );
}
