#!/usr/bin/env bash
set -u

echo "==> Pasta atual:"; pwd
echo "==> Estrutura (topo):"; ls -la

# 1) Achatar duplicação: se existir ./Dashboard-Under com client/server/.github dentro
if [ -d "Dashboard-Under" ] && [ -d "Dashboard-Under/.github" ] && [ -d "Dashboard-Under/client" ] && [ -d "Dashboard-Under/server" ]; then
  echo "==> Detectei repo duplicado dentro de ./Dashboard-Under — vou achatar a estrutura"
  ts=$(date +%Y%m%d_%H%M%S)
  mkdir -p "_backup_before_flatten_$ts"

  # Backup só do mínimo (lista), sem copiar a pasta inteira (pra não ficar gigante)
  (ls -la > "_backup_before_flatten_$ts/root_ls.txt") 2>/dev/null || true

  # Copia conteúdo do repo interno pra raiz (sem trazer .git)
  rsync -a --exclude ".git" "Dashboard-Under/" "./"

  # Remove a pasta duplicada interna
  rm -rf "Dashboard-Under"
else
  echo "==> Nao detectei a duplicacao interna (ok)."
fi

echo "==> Depois do achatamento:"; ls -la

# 2) Garantir repo git aqui
if [ ! -d ".git" ]; then
  echo "ERRO: nao encontrei .git nesta pasta. Abra o terminal na raiz do repo (onde tem .git) e rode de novo."
  exit 1
fi
echo "==> Repo OK em:"; pwd

# 3) Remover lixo local (não versionar)
echo "==> Removendo pastas geradas (node_modules/dist/build/_trash)..."
rm -rf client/node_modules server/node_modules client/dist client/build server/dist server/build client/_trash server/_trash 2>/dev/null || true

# 4) Vite duplicado (mantém TS)
echo "==> Removendo configs duplicadas do Vite (mantendo vite.config.ts)..."
rm -f client/vite.config.js client/vite.config.d.ts 2>/dev/null || true

# 5) Remover arquivos vazios
echo "==> Removendo arquivos vazios..."
find . -type f -empty -not -path "*/.git/*" -print -delete 2>/dev/null || true

# 6) Garantir .gitignore
echo "==> Ajustando .gitignore..."
touch .gitignore

# adiciona bloco se não existir node_modules/
if ! grep -q "node_modules/" .gitignore; then
cat >> .gitignore <<'EOF'

# deps/build/cache
node_modules/
dist/
build/
.vite/
.cache/
_trash/

# env
.env
.env.*
*.local

# logs
*.log

# TS incremental
*.tsbuildinfo

# zips/exports
*.zip
EOF
fi

# 7) Se já estavam versionados, remove do INDEX (sem apagar local, mas aqui já apagamos local)
echo "==> Removendo do Git (index) o que nao deve versionar (se existir)..."
git rm -r --cached client/node_modules server/node_modules client/dist client/build server/dist server/build client/_trash server/_trash 2>/dev/null || true
git rm --cached client/vite.config.js client/vite.config.d.ts 2>/dev/null || true

# 8) Status + commit + push
echo "==> Git status:"
git status

echo "==> Commitando..."
git add -A
git commit -m "chore: cleanup repo structure + remove generated files" 2>/dev/null || echo "Nada novo para commitar."

echo "==> Push..."
git push || echo "Push falhou (login/credenciais). Rode: git push novamente e conclua o login."

echo "==> Finalizado ✅"
