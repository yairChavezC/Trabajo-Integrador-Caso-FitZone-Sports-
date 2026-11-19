#!/usr/bin/env bash
# Exporta los diagramas Mermaid del módulo M3 a SVG y PNG.
# Requiere Node.js 20+ y Chrome o Chromium instalados.
# Uso: bash docs/diagramas/exportar-diagramas.sh

set -euo pipefail

DIAGRAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIAGRAM_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "No se encontró Node.js. Instalalo desde https://nodejs.org" >&2
  exit 1
fi

PUPPETEER_ARGS=()
for candidate in \
  "/usr/bin/google-chrome" \
  "/usr/bin/google-chrome-stable" \
  "/usr/bin/chromium" \
  "/usr/bin/chromium-browser" \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
  if [ -x "$candidate" ]; then
    CONFIG="$(mktemp)"
    printf '{"executablePath":"%s","args":["--no-sandbox"]}' "$candidate" > "$CONFIG"
    PUPPETEER_ARGS=(-p "$CONFIG")
    echo "Usando navegador: $candidate"
    break
  fi
done

if [ ${#PUPPETEER_ARGS[@]} -eq 0 ]; then
  echo "No se encontró Chrome ni Chromium: Mermaid CLI va a descargar Chromium."
fi

fallidos=()
for f in *.mmd; do
  base="${f%.mmd}"
  echo "Exportando $base ..."
  for formato in svg png; do
    if ! npx -y @mermaid-js/mermaid-cli "${PUPPETEER_ARGS[@]}" -i "$f" -o "$base.$formato" -b white --scale 2; then
      fallidos+=("$base.$formato")
    fi
  done
done

echo ""
echo "Exportación finalizada."

if [ ${#fallidos[@]} -gt 0 ]; then
  echo "No se pudieron exportar: ${fallidos[*]}" >&2
  exit 1
fi