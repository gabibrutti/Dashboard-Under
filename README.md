# Dashboard Under

Este repositório contém o **dashboard (front)** em React/Vite (pasta `client`) e um **server** opcional (pasta `server`).

## Como subir no GitHub Pages (recomendado)
1. Faça push deste repositório para o GitHub (branch `main`)
2. Em **Settings → Pages** selecione **GitHub Actions**
3. (Opcional) Configure a variável `VITE_API_BASE_URL` em:
   **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `VITE_API_BASE_URL`
   - Valor: URL do seu backend (ex: `https://api.seudominio.com`)

Pronto: o workflow `Deploy Dashboard (GitHub Pages)` vai buildar e publicar automaticamente.

## Rodar local
### Front
```bash
cd client
npm install
npm run dev
```

### Backend (opcional)
```bash
cd server
cp .env.example .env
npm install
npm start
```

> **Importante:** segredos e tokens **não** devem ser commitados. Use `.env` local e secrets no GitHub.
