#!/usr/bin/env bash
#
# deploy.sh — استقرار پروژه «جریان» روی سرور Ubuntu 22.04 با Nginx
# -----------------------------------------------------------------------------
# این اسکریپت را روی خودِ سرور و با کاربر root اجرا کنید:
#     ssh root@192.168.100.2
#     bash deploy.sh
#
# کاری که انجام می‌دهد:
#   1. نصب پیش‌نیازها (Nginx, git, curl, Node.js 20 LTS)
#   2. گرفتن/به‌روزرسانی آخرین کد از گیت‌هاب روی شاخه‌ی مشخص‌شده
#   3. نصب وابستگی‌ها و بیلد پروژه (npm install && npm run build)
#   4. کپی خروجی بیلد به مسیر وب‌سرور
#   5. نوشتن کانفیگ Nginx با fallback مخصوص SPA (react-router)
#   6. تست کانفیگ و ری‌استارت Nginx
#
# اسکریپت idempotent است؛ می‌توانید هر بار برای انتشار نسخه‌ی جدید دوباره اجرایش کنید.
# -----------------------------------------------------------------------------

set -euo pipefail

# ------------------------- تنظیمات قابل تغییر --------------------------------
REPO_URL="https://github.com/fouladnikan-netizen/erp-jarian.git"
BRANCH="chore/ui-infrastructure-patch"   # شاخه‌ای که می‌خواهید منتشر شود
SERVER_NAME="192.168.100.2"              # IP یا دامنه‌ی سرور
SRC_DIR="/opt/erp-jarian"                # محل clone پروژه روی سرور
WEB_ROOT="/var/www/jaryan"               # محل serve فایل‌های استاتیک
NODE_MAJOR="20"                          # نسخه‌ی Node.js LTS
SITE_NAME="jaryan"                       # نام فایل کانفیگ Nginx
# ----------------------------------------------------------------------------

log() { printf "\n\033[1;32m==> %s\033[0m\n" "$*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "این اسکریپت باید با root اجرا شود. مثال: sudo bash deploy.sh" >&2
  exit 1
fi

log "1/6 نصب پیش‌نیازها (Nginx, git, curl)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl ca-certificates

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]]; then
  log "نصب Node.js ${NODE_MAJOR} LTS از NodeSource"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  log "Node.js از قبل نصب است: $(node -v)"
fi

log "2/6 گرفتن/به‌روزرسانی کد از گیت‌هاب (شاخه: ${BRANCH})"
if [[ -d "${SRC_DIR}/.git" ]]; then
  git -C "${SRC_DIR}" fetch --all --prune
  git -C "${SRC_DIR}" checkout "${BRANCH}"
  git -C "${SRC_DIR}" reset --hard "origin/${BRANCH}"
else
  git clone "${REPO_URL}" "${SRC_DIR}"
  git -C "${SRC_DIR}" checkout "${BRANCH}"
fi

log "3/6 نصب وابستگی‌ها و بیلد"
cd "${SRC_DIR}"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

log "4/6 کپی خروجی بیلد به ${WEB_ROOT}"
rm -rf "${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"
cp -r "${SRC_DIR}/dist/." "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"

log "5/6 نوشتن کانفیگ Nginx (با SPA fallback)"
cat > "/etc/nginx/sites-available/${SITE_NAME}" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${WEB_ROOT};
    index index.html;

    # همه‌ی مسیرها به index.html برگردند تا react-router درست کار کند
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # کش بلندمدت برای فایل‌های استاتیک نسخه‌دار
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf "/etc/nginx/sites-available/${SITE_NAME}" "/etc/nginx/sites-enabled/${SITE_NAME}"
rm -f /etc/nginx/sites-enabled/default

log "6/6 تست کانفیگ و ری‌استارت Nginx"
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx

log "انجام شد! پروژه در دسترس است: http://${SERVER_NAME}/"
