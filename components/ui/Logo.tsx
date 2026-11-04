import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <linearGradient id="nx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset=".6" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="8.5" y="3" width="15" height="26" rx="4" fill="none" stroke="url(#nx-g)" strokeWidth="2" />
      <path d="M12.5 21V11l7 10V11" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", suffix }: { href?: string; suffix?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="NEXPHONE — inicio">
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[8deg]" />
      <span className="font-display text-[1.05rem] font-semibold tracking-[0.22em] text-white">
        NEX<span className="text-cyan-300">PHONE</span>
      </span>
      {suffix && (
        <span className="ml-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 font-mono text-[0.6rem] tracking-[0.2em] text-violet-300">
          {suffix}
        </span>
      )}
    </Link>
  );
}
