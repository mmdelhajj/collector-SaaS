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
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
        >
          <path
            d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
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
