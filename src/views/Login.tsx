import { useState, type FormEvent } from 'react';
import type { Role } from '../App';

export default function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('admin');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(selectedRole);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tak-yellow/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 bg-tak-yellow flex items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)] mb-4">
            <span className="material-symbols-outlined text-zinc-950 text-4xl font-bold">query_stats</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">FinOps Inteligente</h1>
          <p className="text-sm text-zinc-400 font-medium">FinOps Demo - Portal Corporativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Seleccionar Rol</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">badge</span>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow transition-all appearance-none cursor-pointer"
              >
                <option value="admin">Administrador FinOps (TAK)</option>
                <option value="client">Ejecutivo / Cliente Cloud</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Usuario / Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">person</span>
              <input 
                type="text" 
                defaultValue={selectedRole === 'admin' ? "[correo omitido]" : "ejecutivo@cliente.com"}
                key={selectedRole}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow transition-all" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">lock</span>
              <input 
                type="password" 
                defaultValue="********"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow transition-all" 
                required 
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 pb-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative inline-block w-4 h-4">
                <input type="checkbox" className="peer absolute opacity-0 w-0 h-0" defaultChecked />
                <div className="w-4 h-4 border border-zinc-700 bg-zinc-950 rounded flex items-center justify-center peer-checked:bg-tak-yellow peer-checked:border-tak-yellow transition-colors">
                  <span className="material-symbols-outlined text-[12px] text-zinc-950 opacity-0 peer-checked:opacity-100 font-bold">check</span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Recordar sesión</span>
            </label>
            <a href="#" className="text-xs text-tak-yellow hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-tak-yellow hover:bg-yellow-400 text-zinc-950 font-bold text-sm py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(250,204,21,0.2)]"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span>
            ) : (
              <>
                Ingresar al Panel
                <span className="material-symbols-outlined font-bold text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="absolute bottom-8 text-xs text-zinc-600 font-medium">
        &copy; {new Date().getFullYear()} FinOps Demo. Todos los derechos reservados.
      </div>
    </div>
  );
}
