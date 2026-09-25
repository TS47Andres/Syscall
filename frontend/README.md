# Syscall frontend

The React/Vite application is built into a standalone Nginx container. From the repository root:

```powershell
docker compose up -d --build
```

Open `http://localhost:8080`; change the published port with `FRONTEND_PORT`. The frontend container proxies `/api/`, `/calls/`, `/ready`, and `/health` to the API container so the browser uses one origin and does not require permissive CORS.

For local Vite development, run the API stack first, then:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

Vite listens on `http://localhost:5173` and proxies backend requests to `http://localhost:3000`. `npm --prefix frontend run build` performs the strict TypeScript build and produces the static site in `frontend/dist`.

Authentication and mailbox data must come from the Syscall API; do not add local mock credentials or fake-success fallbacks. Accounts are provisioned through the existing voice account-creation flow, after which a user can authenticate with the configured password or OTP.
