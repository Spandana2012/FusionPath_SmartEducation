"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Code2, Compass, Route } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionLink = {
  label: string;
  href: string;
  icon: typeof Route;
};

const learningLinks: SectionLink[] = [
  { label: "Overview", href: "/learning", icon: Route },
  { label: "Learning Path", href: "/learning-path", icon: Route },
  { label: "Learn", href: "/learn", icon: BookOpen },
  { label: "Roadmap", href: "/roadmap", icon: Compass },
  { label: "Practice", href: "/practice", icon: Code2 },
  { label: "Projects", href: "/projects", icon: BriefcaseBusiness },
  { label: "Progress", href: "/progress", icon: ChartNoAxesColumnIncreasing },
];

const skillLinks: SectionLink[] = [{ label: "Skill Analysis", href: "/skill-analysis", icon: Route }];

export function LearningSectionNav() {
  return <SectionNav label="My Learning" links={learningLinks} />;
}

export function SkillsSectionNav() {
  return <SectionNav label="Skills" links={skillLinks} />;
}

function SectionNav({ label, links }: { label: string; links: SectionLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={`${label} sections`} className="border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex min-h-14 items-center gap-4 overflow-x-auto py-2">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{label}</span>
        <div className="flex min-w-max items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const route = link.href.split("#")[0];
            const active = pathname === route;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
                  "hover:bg-secondary/70 hover:text-foreground",
                  active && "bg-secondary text-foreground [&_svg]:text-accent",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
