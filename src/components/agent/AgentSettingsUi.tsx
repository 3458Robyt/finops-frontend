export function AgentMetric({ title, value, helper, icon }: { readonly title: string; readonly value: string | number; readonly helper: string; readonly icon: string }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
          <p className="mt-1 break-words text-xs font-bold text-zinc-500">{helper}</p>
        </div>
        <span className="material-symbols-outlined text-xl text-tak-yellow">{icon}</span>
      </div>
    </article>
  );
}

export function SectionHeader({ title, eyebrow, icon }: { readonly title: string; readonly eyebrow: string; readonly icon: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined mt-0.5 text-xl text-tak-yellow">{icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{eyebrow}</p>
        <h3 className="mt-1 text-base font-black text-white">{title}</h3>
      </div>
    </div>
  );
}

export function StatusBadge({ label, tone }: { readonly label: string; readonly tone: 'success' | 'warning' }) {
  const classes = tone === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
  return <span className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-widest ${classes}`}>{label}</span>;
}

export function ReadOnlyNotice({ text }: { readonly text: string }) {
  return <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200">{text}</div>;
}

export function Input({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-tak-yellow" />
    </label>
  );
}

export function TextArea({ label, value, rows, onChange }: { readonly label: string; readonly value: string; readonly rows: number; readonly onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold leading-relaxed text-zinc-100 outline-none focus:border-tak-yellow" />
    </label>
  );
}
