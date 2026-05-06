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
          <g stroke="currentColor" strokeLinecap="round" fill="none">
            <line x1="5" y1="11" x2="10" y2="11" strokeWidth="2" opacity="0.3" />
            <line x1="5" y1="16" x2="12" y2="16" strokeWidth="2" opacity="0.55" />
            <line x1="5" y1="21" x2="14" y2="21" strokeWidth="2" opacity="0.8" />
            <path
              d="M14.5 17 L18 21 L26 9"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
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
