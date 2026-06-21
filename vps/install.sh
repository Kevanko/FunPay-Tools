#!/usr/bin/env bash
# FP Tools VPS — установщик в одну команду.
#
#   curl -fsSL https://raw.githubusercontent.com/Kevanko/FunPay-Tools/main/vps/install.sh | bash
#
# БЕЗОПАСНО для уже работающих сервисов (remnawave, nginx, панели и т.п.):
#   • НЕ трогает системные пакеты (никакого apt/yum), НЕ ставит глобальный Node —
#     качает локальный Node прямо в свою папку.
#   • НЕ трогает firewall, nginx, порты 80/443 — слушает только свой порт (8787).
#   • Всё живёт в /opt/fpt-vps под отдельным пользователем fptvps, отдельный
#     systemd-юнит fpt-vps. Снести = systemctl disable --now fpt-vps + rm -rf /opt/fpt-vps.
#
# Переменные (необязательно):  FPT_PORT=9000  FPT_REF=main  bash install.sh
set -euo pipefail

APP_DIR=/opt/fpt-vps
PORT="${FPT_PORT:-8787}"
REF="${FPT_REF:-main}"
RAW="https://raw.githubusercontent.com/Kevanko/FunPay-Tools/${REF}/vps"
NODE_VER="v20.18.0"

log() { printf '\033[36m[fpt-vps]\033[0m %s\n' "$*"; }
die() { printf '\033[31m[fpt-vps] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "запусти от root (или через sudo)."
command -v systemctl >/dev/null 2>&1 || die "нужен systemd."

# архитектура для официального бинарника Node
case "$(uname -m)" in
    x86_64|amd64) NARCH=x64 ;;
    aarch64|arm64) NARCH=arm64 ;;
    *) die "неподдерживаемая архитектура $(uname -m)" ;;
esac

log "каталог $APP_DIR"
mkdir -p "$APP_DIR"

# отдельный системный пользователь (без шелла/без дома) — изоляция от остального
if ! id fptvps >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin fptvps 2>/dev/null \
      || useradd --system --no-create-home --shell /bin/false fptvps
fi

# локальный Node (НЕ системный) — чтобы ничьи версии не задеть
if [ ! -x "$APP_DIR/node/bin/node" ]; then
    log "ставлю локальный Node ${NODE_VER} (${NARCH})…"
    TARBALL="node-${NODE_VER}-linux-${NARCH}.tar.xz"
    curl -fsSL "https://nodejs.org/dist/${NODE_VER}/${TARBALL}" -o "/tmp/${TARBALL}"
    rm -rf "$APP_DIR/node" && mkdir -p "$APP_DIR/node"
    tar -xJf "/tmp/${TARBALL}" -C "$APP_DIR/node" --strip-components=1
    rm -f "/tmp/${TARBALL}"
fi
NODE="$APP_DIR/node/bin/node"
NPM="$APP_DIR/node/bin/npm"

log "скачиваю сервис…"
curl -fsSL "$RAW/server.js"    -o "$APP_DIR/server.js"
curl -fsSL "$RAW/package.json" -o "$APP_DIR/package.json"

log "ставлю зависимость undici (локально)…"
( cd "$APP_DIR" && "$NPM" install --omit=dev --no-audit --no-fund --loglevel=error )

chown -R fptvps:fptvps "$APP_DIR"

log "systemd-юнит fpt-vps…"
cat > /etc/systemd/system/fpt-vps.service <<EOF
[Unit]
Description=FP Tools VPS service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=fptvps
WorkingDirectory=$APP_DIR
Environment=FPT_PORT=$PORT
ExecStart=$NODE $APP_DIR/server.js
Restart=always
RestartSec=5
# лёгкий и изолированный
MemoryMax=200M
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now fpt-vps >/dev/null 2>&1 || systemctl restart fpt-vps

# дождаться, пока сервис запишет токен
TOKEN=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
    if [ -f "$APP_DIR/data.json" ]; then
        TOKEN="$("$NODE" -e 'try{process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).token||"")}catch(e){}' "$APP_DIR/data.json")"
        [ -n "$TOKEN" ] && break
    fi
    sleep 1
done

IP="$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"

echo
log "готово. Сервис работает (systemctl status fpt-vps)."
echo "──────────────────────────────────────────────"
echo "  URL:   http://${IP:-<IP-сервера>}:${PORT}"
echo "  ТОКЕН: ${TOKEN:-<смотри: cat $APP_DIR/data.json>}"
echo "──────────────────────────────────────────────"
echo "Вставь URL и ТОКЕН в расширении: Настройки → VPS."
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    echo "ВНИМАНИЕ: ufw активен — открой порт:  ufw allow ${PORT}/tcp"
fi
