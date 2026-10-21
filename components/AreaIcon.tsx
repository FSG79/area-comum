import type { ReactNode } from "react";

export interface AreaVisual {
  key: string;
  soft: string;
  text: string;
  dot: string;
  icon: ReactNode;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const visuals: Record<string, Omit<AreaVisual, "key">> = {
  "Salão de festas": {
    soft: "bg-[#f8ecd1]",
    text: "text-[#9a6a1d]",
    dot: "#d9a441",
    icon: (
      <Icon>
        <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3Z" />
        <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
        <path d="M5 15l.6 1.6L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.4L5 15Z" />
      </Icon>
    ),
  },
  Churrasqueira: {
    soft: "bg-[#fbe4e9]",
    text: "text-[#b52a4e]",
    dot: "#d61f5c",
    icon: (
      <Icon>
        <circle cx="12" cy="10" r="6" />
        <path d="M6 10h12M8.5 14.5L7 21M15.5 14.5L17 21" />
        <path d="M9 4.5c0-1 1-1.5 1.5-2M13 4.5c0-1 1-1.5 1.5-2" />
      </Icon>
    ),
  },
  Quadra: {
    soft: "bg-[#e2eef8]",
    text: "text-[#1c5f95]",
    dot: "#146fae",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.4 2.2 3.6 5 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-5-3.6-8s1.2-5.8 3.6-8Z" />
      </Icon>
    ),
  },
  "Sala de reuniões": {
    soft: "bg-[#e4efe8]",
    text: "text-[#2e6652]",
    dot: "#3e6c5c",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4M9 8h6M9 11h3" />
      </Icon>
    ),
  },
};

const fallback: Omit<AreaVisual, "key"> = {
  soft: "bg-cream-200",
  text: "text-ink-600",
  dot: "#4f7869",
  icon: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
};

export function getAreaVisual(name: string): AreaVisual {
  const base = visuals[name] ?? fallback;
  return { key: name, ...base };
}

export function AreaIcon({
  name,
  className = "",
  tone = "soft",
}: {
  name: string;
  className?: string;
  tone?: "soft" | "plain";
}) {
  const visual = getAreaVisual(name);
  return (
    <span
      className={
        tone === "soft"
          ? `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${visual.soft} ${visual.text} ${className}`
          : `flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.soft} ${visual.text} ${className}`
      }
    >
      {visual.icon}
    </span>
  );
}
