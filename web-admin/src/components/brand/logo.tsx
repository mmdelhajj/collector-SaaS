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
          <path
            d="M9.6 7.5h7.6c3.4 0 5.7 2.1 5.7 5.2 0 2.4-1.4 4.2-3.7 4.9l4.3 6.9h-4.2l-3.9-6.4H13v6.4H9.6V7.5Zm3.4 2.8v4.9h4c1.7 0 2.7-.9 2.7-2.4 0-1.5-1-2.5-2.7-2.5h-4Z"
            fill="currentColor"
          />
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
