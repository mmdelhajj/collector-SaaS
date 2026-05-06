import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-5"
        >
          <g
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M4 12 L7 16 L4 20" strokeWidth="2" opacity="0.3" />
            <path d="M8 12 L11 16 L8 20" strokeWidth="2" opacity="0.55" />
            <path d="M12 12 L15 16 L12 20" strokeWidth="2" opacity="0.8" />
            <path d="M16 18 L20 22 L28 8" strokeWidth="3.5" />
          </g>
        </svg>
      </span>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">RunCollect</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </span>
        </div>
      )}
    </div>
  );
}
