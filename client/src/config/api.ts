export const apiConfig = {
  freshservice: {
    domain: "https://under.freshservice.com",
    apiKey: "Sdhk6_bCZPmgLHWdKqXu",
  },
  zenvia: {
    apiToken: "ba9ad280a78ec4aa62f86cd96f032994",
  },
};

/**
 * Monta a URL completa para chamadas na API (server).
 * Se você tiver um backend separado (Render/EC2/etc), troque o domain acima para o domínio do backend.
 */
export function apiUrl(path = "") {
  const base = apiConfig.freshservice.domain.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
