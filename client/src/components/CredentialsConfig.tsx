import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, Save, AlertCircle } from "lucide-react";

interface CredentialsConfigProps {
  onCredentialsSet: (credentials: {
    freshserviceApiKey: string;
    freshserviceDomain: string;
    zenviaApiToken: string;
  }) => void;
}

export default function CredentialsConfig({ onCredentialsSet }: CredentialsConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [freshserviceApiKey, setFreshserviceApiKey] = useState("");
  const [freshserviceDomain, setFreshserviceDomain] = useState("https://under.freshservice.com");
  const [zenviaApiToken, setZenviaApiToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Carregar credenciais salvas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_credentials");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFreshserviceApiKey(parsed.freshserviceApiKey || "");
        setFreshserviceDomain(parsed.freshserviceDomain || "https://under.freshservice.com");
        setZenviaApiToken(parsed.zenviaApiToken || "");
        
        // Se já tem credenciais salvas, enviar automaticamente
        if (parsed.freshserviceApiKey && parsed.zenviaApiToken) {
          onCredentialsSet({
            freshserviceApiKey: parsed.freshserviceApiKey,
            freshserviceDomain: parsed.freshserviceDomain || "https://under.freshservice.com",
            zenviaApiToken: parsed.zenviaApiToken,
          });
        } else {
          setIsOpen(true);
        }
      } catch (e) {
        console.error("Erro ao carregar credenciais:", e);
        setIsOpen(true);
      }
    } else {
      setIsOpen(true);
    }
  }, [onCredentialsSet]);

  const handleSave = () => {
    if (!freshserviceApiKey.trim()) {
      setError("A chave API do Freshservice é obrigatória");
      return;
    }
    if (!zenviaApiToken.trim()) {
      setError("O Access Token do Zenvia é obrigatório");
      return;
    }
    if (!freshserviceDomain.trim()) {
      setError("O domínio do Freshservice é obrigatório");
      return;
    }

    setError(null);
    
    const credentials = {
      freshserviceApiKey: freshserviceApiKey.trim(),
      freshserviceDomain: freshserviceDomain.trim(),
      zenviaApiToken: zenviaApiToken.trim(),
    };

    // Salvar no localStorage
    localStorage.setItem("dashboard_credentials", JSON.stringify(credentials));

    // Enviar para o componente pai
    onCredentialsSet(credentials);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2">
                  <Key className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Configuração de Credenciais</h2>
                  <p className="text-sm text-slate-500">Configure as credenciais de acesso às APIs</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Domínio do Freshservice
                </label>
                <input
                  type="text"
                  value={freshserviceDomain}
                  onChange={(e) => setFreshserviceDomain(e.target.value)}
                  placeholder="https://under.freshservice.com"
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  URL base do seu domínio Freshservice (ex: https://seu-dominio.freshservice.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Chave API do Freshservice *
                </label>
                <input
                  type="password"
                  value={freshserviceApiKey}
                  onChange={(e) => setFreshserviceApiKey(e.target.value)}
                  placeholder="Sua chave API do Freshservice"
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Chave API gerada nas configurações do Freshservice (v2 preferencialmente)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Access Token do Zenvia Voice *
                </label>
                <input
                  type="password"
                  value={zenviaApiToken}
                  onChange={(e) => setZenviaApiToken(e.target.value)}
                  placeholder="Seu Access Token do Zenvia Voice"
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Access Token da API do Zenvia Voice (antiga TotalVoice)
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition-colors"
              >
                <Save className="h-4 w-4" />
                Salvar Credenciais
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

