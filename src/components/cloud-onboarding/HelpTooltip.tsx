import { useEffect, useId, useState, type ReactNode } from 'react';

interface HelpTooltipProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Accessible help affordance that works with hover, keyboard focus and touch. */
export function HelpTooltip({ label, children }: HelpTooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-black text-zinc-300 transition hover:border-tak-yellow hover:text-tak-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tak-yellow"
        aria-label={label}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-zinc-200 shadow-2xl"
        >
          {children}
        </span>
      )}
    </span>
  );
}
