import { useState } from 'react';

export default function MfaRecoveryCodesDialog({ codes, onClose }: {
  readonly codes: readonly string[];
  readonly onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Códigos de recuperación FinOps Inteligente\n\n${codes.join('\n')}\n`;

  const copyCodes = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const downloadCodes = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finops-codigos-recuperacion.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="mfa-recovery-title" className="w-full max-w-xl rounded-3xl border border-tak-yellow/30 bg-zinc-900 p-6 shadow-2xl">
        <h2 id="mfa-recovery-title" className="text-xl font-black text-white">Guarda tus códigos de recuperación</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Cada código funciona una sola vez si pierdes acceso al autenticador. No volverán a mostrarse.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-2">
          {codes.map((code) => <code key={code} className="text-center text-sm font-bold tracking-wider text-tak-yellow">{code}</code>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void copyCodes()} className="rounded-xl bg-zinc-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-700">
            {copied ? 'Copiados' : 'Copiar'}
          </button>
          <button type="button" onClick={downloadCodes} className="rounded-xl bg-zinc-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-700">
            Descargar
          </button>
          <button type="button" onClick={onClose} className="ml-auto rounded-xl bg-tak-yellow px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950">
            Ya los guardé
          </button>
        </div>
      </section>
    </div>
  );
}
