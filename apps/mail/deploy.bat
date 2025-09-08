@echo off
set VITE_PUBLIC_BACKEND_URL=https://infflow-api-production.prabhatravib.workers.dev
set VITE_PUBLIC_APP_URL=https://infflow-email.prabhatravib.workers.dev
pnpm build
wrangler deploy 