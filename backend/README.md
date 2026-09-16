# Jarian Backend API (v1)

PostgreSQL + Express — Auth (JWT), RBAC سمت سرور، Company، Order.

## پیش‌نیاز

- Node 20+
- PostgreSQL 16 (Homebrew یا Docker Compose)

## راه‌اندازی سریع (macOS / Homebrew)

```bash
# اگر Postgres خاموش است:
brew services start postgresql@16

# دیتابیس (یک‌بار):
createdb jarian   # یا: psql -d postgres -c "CREATE DATABASE jarian;"

cd backend
cp .env.example .env
npm install
npm run setup    # migrate + seed
npm run dev      # http://localhost:3100
```

با Docker (اگر Docker دارید):

```bash
docker compose up -d postgres
# سپس DATABASE_URL=postgresql://jarian:jarian@127.0.0.1:5432/jarian در backend/.env
```

## کاربر پیش‌فرض seed

| فیلد | مقدار |
|------|--------|
| username | `admin` |
| password | `Admin123!` |
| نقش | `admin` (همه مجوزها) |

**در production حتماً رمز و `JWT_SECRET` را عوض کنید.**

## API

| Method | Path | مجوز |
|--------|------|------|
| GET | `/api/health` | عمومی |
| POST | `/api/v1/auth/login` | عمومی |
| GET | `/api/v1/auth/me` | Bearer |
| GET/POST | `/api/v1/companies` | `companies:read` / `write` |
| GET/PATCH | `/api/v1/companies/:id` | … |
| GET/POST | `/api/v1/orders` | `orders:read` / `write` |
| GET/PATCH | `/api/v1/orders/:id` | … |
| POST | `/api/ai/rewrite` | همان سرویس قبلی لیارا |

### نمونه لاگین

```bash
curl -s http://127.0.0.1:3100/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin123!"}'
```

### نمونه لیست شرکت‌ها

```bash
TOKEN=...
curl -s http://127.0.0.1:3100/api/v1/companies \
  -H "Authorization: Bearer $TOKEN"
```

## هم‌راستایی دامنه

- Company = aggregate اصلی مشتری (DDL-01)
- ContactPerson جدول فرزند Company (DDL-02)
- Order = aggregate عملیاتی؛ جزئیات مرحله در `payload` JSONB تا تثبیت schema جزئی (DDL-03)
- Activity یکپارچه عمداً در v1 نیست (DDL-05)
- Lead/API جدول `leads` تا قبل از DDL Gate ممنوع است

قوانین تحویل Entity: `Docs/architecture/ENTITY_DELIVERY_PIPELINE.md`  
بکاپ/ریستور: `backend/scripts/backup-pg.sh`, `restore-pg.sh`

فرانت با `VITE_USE_MOCK_API=false` از این API می‌خواند؛ Zustand فقط cache است.
