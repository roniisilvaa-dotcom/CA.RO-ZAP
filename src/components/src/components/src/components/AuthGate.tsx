import { useEffect, useState } from 'react';
import { Bot, Lock, Mail, LogIn } from 'lucide-react';
import { getToken, login } from '../lib/api';

// Portao de autenticacao: mostra o login se nao houver token; senao renderiza o painel.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setAuthed(!!getToken()); }, []);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email.trim(), password);
      setAuthed(true);
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  };

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-3">
            <Bot className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-zinc-100 font-bold text-xl">CA.RO ZAP</h1>
          <p className="text-zinc-500 text-xs mt-1">Painel de atendimento inteligente</p>
        </div>
        <form onSubmit={doLogin} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs">E-mail</label>
            <div className="mt-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3">
              <Mail className="w-4 h-4 text-zinc-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 outline-none" placeholder="voce@exemplo.com" />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-xs">Senha</label>
            <div className="mt-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3">
              <Lock className="w-4 h-4 text-zinc-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="flex-1 bg-transparent py-2.5 text-sm text-zinc-100 outline-none" placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            <LogIn className="w-4 h-4" /> {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
