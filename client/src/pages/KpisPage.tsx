import { useEffect } from "react";
import { apiUrl } from "@/config/api";

export default function KpisPage() {
  useEffect(() => {
    // Só para garantir que a config está sendo usada e o arquivo não fica "vazio"
    // (não precisa funcionar agora pro Pages subir).
    void apiUrl;
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>KPIs</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Página de KPIs em ajuste. O deploy do dashboard já pode subir normalmente.
      </p>
    </div>
  );
}
