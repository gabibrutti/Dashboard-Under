import { useEffect, useState } from "react";

type Credentials = {
  freshserviceApiKey: string;
  freshserviceDomain: string;
  zenviaApiToken: string;
};

export default function CredentialsConfig({
  onCredentialsSet,
}: {
  onCredentialsSet: (creds: Credentials) => void;
}) {
  const STORAGE_KEY = "dashboard_under_credentials_v1";

  const [open, setOpen] = useState(false);
  const [freshserviceApiKey, setFreshserviceApiKey] = useState("");
  const [freshserviceDomain, setFreshserviceDomain] = useState("");
  const [zenviaApiToken, setZenviaApiToken] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Credentials>;
        if (saved.freshserviceApiKey) setFreshserviceApiKey(saved.freshserviceApiKey);
        if (saved.freshserviceDomain) setFreshserviceDomain(saved.freshserviceDomain);
        if (saved.zenviaApiToken) setZenviaApiToken(saved.zenviaApiToken);

        if (saved.freshserviceApiKey && saved.freshserviceDomain && saved.zenviaApiToken) {
          onCredentialsSet({
            freshserviceApiKey: saved.freshserviceApiKey,
            freshserviceDomain: saved.freshserviceDomain,
            zenviaApiToken: saved.zenviaApiToken,
          });
          setOpen(false);
          return;
        }
      }
    } catch {
      // ignore
    }
    setOpen(true);
  }, [onCredentialsSet]);

  function save() {
    const creds: Credentials = {
      freshserviceApiKey: freshserviceApiKey.trim(),
      freshserviceDomain: freshserviceDomain.trim(),
      zenviaApiToken: zenviaApiToken.trim(),
    };

    if (!creds.freshserviceApiKey || !creds.freshserviceDomain || !creds.zenviaApiToken) {
      alert("Preencha todos os campos.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    onCredentialsSet(creds);
    setOpen(false);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setFreshserviceApiKey("");
    setFreshserviceDomain("");
    setZenviaApiToken("");
    setOpen(true);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
      >
        Credenciais
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Configurar credenciais</h2>
          <p className="mt-1 text-sm text-slate-600">
            Essas informações ficam salvas no seu navegador (localStorage).
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Freshservice API Key</label>
            <input
              value={freshserviceApiKey}
              onChange={(e) => setFreshserviceApiKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="cole sua API key"
              type="password"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Freshservice Domain</label>
            <input
              value={freshserviceDomain}
              onChange={(e) => setFreshserviceDomain(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="ex: under (para https://under.freshservice.com)"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Zenvia API Token</label>
            <input
              value={zenviaApiToken}
              onChange={(e) => setZenviaApiToken(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="cole seu token"
              type="password"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={clear}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpar
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
            <button
              onClick={save}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
