"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  Menu,
  Route,
  Sparkles,
  UserRound,
  X,
  Network,
} from "lucide-react";
import { useState } from "react";

import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Learning", href: "/learning", icon: Route },
  { label: "Skills", href: "/skill-analysis", icon: Network },
  { label: "Career", href: "/career", icon: ChartNoAxesColumnIncreasing },
  { label: "AI Tutor", href: "/tutor", icon: Bot },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/72 shadow-[0_12px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
      <nav className="container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-ring">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-md bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent))_52%,hsl(var(--violet)))] text-primary-foreground shadow-neon-blue transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_34px_hsl(var(--accent)/0.32)]">
            <Route className="h-5 w-5" aria-hidden="true" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-base font-semibold tracking-normal text-foreground">
              Fusion<span className="text-accent">Path</span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">Your goal. Your gaps. Your path.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item, index) => (
            <NavLink key={item.href} item={item} active={index === 0} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/dashboard">Open workspace</Link>
          </Button>
        </div>
      </nav>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="container pb-4 lg:hidden"
        >
          <div className="glass-panel grid gap-1 rounded-lg p-2">
            {navItems.map((item, index) => (
              <MobileNavLink key={item.href} item={item} active={index === 0} onClick={() => setOpen(false)} />
            ))}
            <Button asChild className="mt-2 w-full">
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                Open workspace
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : null}
    </header>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const pathname = usePathname();
  const isActive = isNavItemActive(item, pathname, active);

  return (
    <motion.div whileHover={{ y: -1 }} whileTap={{ y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      <Link
        href={item.href}
        className={cn(
          "focus-ring relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-all duration-200",
          "hover:bg-secondary/70 hover:text-foreground hover:[&_svg]:text-accent",
          isActive && "bg-secondary text-foreground shadow-[inset_0_-1px_0_hsl(var(--accent)/0.45)] [&_svg]:text-accent",
        )}
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {item.label}
        {isActive ? (
          <span className="absolute inset-x-3 -bottom-[1.28rem] h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]" />
        ) : null}
      </Link>
    </motion.div>
  );
}

function MobileNavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  const pathname = usePathname();
  const isActive = isNavItemActive(item, pathname, active);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "focus-ring flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground",
        isActive && "bg-secondary text-foreground",
      )}
    >
      {Icon ? <Icon className={cn("h-4 w-4", isActive && "text-accent")} aria-hidden="true" /> : null}
      {item.label}
    </Link>
  );
}

function isNavItemActive(item: NavItem, pathname: string, fallback: boolean) {
  const learningRoutes = ["/learning", "/learning-path", "/learn", "/roadmap", "/practice", "/projects", "/progress"];
  const isLearningRoute = learningRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isSkillsRoute = pathname === "/skill-analysis" || pathname.startsWith("/skill-analysis/") || pathname === "/skill-graph";

  if (item.href === "/learning") return isLearningRoute;
  if (item.href === "/skill-analysis") return isSkillsRoute;
  return pathname === item.href || (fallback && pathname === "/");
}
