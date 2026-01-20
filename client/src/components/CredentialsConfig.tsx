import { useState, useEffect } from 'react';

export default function CredentialsConfig({ onCredentialsSet }) {
  const [apiKey, setApiKey] = useState('');
  const [domain, setDomain] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const savedCreds = localStorage.getItem('freshservice_creds');
    if (savedCreds) {
      onCredentialsSet(JSON.parse(savedCreds));
    } else {
      setShowModal(true);
    }
  }, [onCredentialsSet]);

  const handleSave = () => {
    const creds = { freshserviceApiKey: apiKey, freshserviceDomain: domain };
    localStorage.setItem('freshservice_creds', JSON.stringify(creds));
    onCredentialsSet(creds);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Configurar Credenciais</h2>
        <p className="text-slate-400 mb-6 text-sm">Insira sua chave de API e domínio do Freshservice para carregar os dados.</p>
        <div className="space-y-4">
          <input 
            type="text"
            placeholder="Domínio (ex: suaempresa.freshservice.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
          />
          <input 
            type="password"
            placeholder="Chave da API"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
          />
        </div>
        <button 
          onClick={handleSave}
          className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Salvar e Carregar Dashboard
        </button>
      </div>
    </div>
  );
}
