# Labify 🧪

A professional, offline-first **laboratory management system** for tracking experiments, materials, tools, suppliers, procurement orders, and inventory — with cloud sync and Excel export.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

- **📋 Experiments** — Track protocol IDs (`EXP-YYYYMMDD-NN`), timelines, linked materials & instruments, cost estimates, and external document links.
- **🧪 Materials Catalog** — Full catalog with supplier links, images, units of measure (mL, g, unit, L), consumable vs. equipment flags.
- **🔧 Tools & Instruments** — Inventory of lab equipment with supplier info, pricing, and quantity.
- **🏢 Suppliers** — Centralized supplier directory with direct product page links.
- **📦 Orders** — Procurement workflow: add from experiment → mark as received → auto-convert to inventory.
- **📊 Inventory** — Live stock tracking with batch numbers, received dates, and delete/consumption tracking.
- **📁 Attachments** — Upload documents and images (base64) directly to experiments and materials.
- **📤 Excel Export** — Export any view or full per-experiment multi-sheet workbooks (Overview · Materials · Instruments · Cost Summary · Documents).
- **☁️ Cloud Sync** — Optional WebDAV backup with auto-debounce sync and status indicators.
- **🌗 Theme Toggle** — Light / dark mode with persistent preference.
- **🔍 Global Search** — Search/filter across all tables and card grids.
- **💾 Fully Offline** — All data persists in IndexedDB (browser-native). No backend required.

---

## 🖼️ Screenshots

| Light Mode | Dark Mode |
|:---|:---|
| ![Experiments Light](assets/screenshot-experiments-light.svg) | ![Experiments Dark](assets/screenshot-experiments-dark.svg) |
| *Experiments dashboard with expandable detail rows* | *Same view in dark mode* |

| Materials | Orders |
|:---|:---|
| ![Materials](assets/screenshot-materials.svg) | ![Orders](assets/screenshot-orders.svg) |
| *Material cards with Sigma-Aldrich product images* | *Procurement orders with batch tracking* |

| Excel Export | Cloud Sync |
|:---|:---|
| ![Excel](assets/screenshot-excel.svg) | ![Sync](assets/screenshot-sync.svg) |
| *Multi-sheet experiment workbook* | *WebDAV settings & sync status* |

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/labify.git
cd labify

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The dev server now listens on **0.0.0.0** by default (accessible from any device on your network).  
To bind a specific IP or port:

```bash
HOST=192.168.1.5 PORT=3000 npm run dev
# or use LISTEN instead of HOST
LISTEN=192.168.1.5 npm run preview
```

Then open http://localhost:5173 (or the IP/port you chose) in your browser.

---

## 🏗 Architecture

```
labify/
├── src/
│   ├── db.ts           # IndexedDB layer (stores: suppliers, materials, instruments,
│   │                   #   experiments, orders, inventory)
│   ├── store.tsx       # React Context + useReducer state management
│   ├── sync.ts         # WebDAV sync manager (auto-backup on every CRUD change)
│   ├── webdav.ts       # WebDAV client
│   ├── export.ts       # Excel export utilities (xlsx)
│   ├── types.ts        # Core TypeScript interfaces
│   ├── theme.tsx       # Light/dark theme provider
│   ├── main.tsx        # Vite entry point
│   ├── App.tsx         # Shell layout + router
│   └── components/
│       ├── Experiments.tsx    # Experiment CRUD + cost calculator
│       ├── Materials.tsx      # Material catalog + image upload
│       ├── Instruments.tsx    # Tool inventory
│       ├── Suppliers.tsx      # Supplier directory
│       ├── Orders.tsx         # Procurement orders
│       ├── Inventory.tsx      # Received stock tracking
│       ├── Modal.tsx          # Reusable modal overlay
│       ├── Settings.tsx       # WebDAV configuration
│       └── Attachments.tsx    # File upload/download helpers
├── public/             # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 📦 Seed Data

Labify ships with pre-loaded example data extracted from real research literature:

- **Sigma-Aldrich materials**: HCl, PVA, HF, LiF, MAX Ti₃AlC₂
- **Paper-derived workflow**: *High-Speed Ionic Synaptic Memory Based on 2D Titanium Carbide MXene* (Adv. Funct. Mater. 2022)
  - Experiment: Ti₃AlC₂ MAX Phase Synthesis
  - Experiment: Ti₃C₂Tₓ MXene Etching & Delamination
  - Experiment: MXene-ECRAM Synaptic Memory Device Fabrication
- **Tools**: Keithley 4200A-SCS, Keysight DSOS054A, Hitachi S4800 SEM, PANalytical X'Pert PRO, StratoSequence VI LbL robot, etc.

---

## 🐳 Deploy to a Server (recommended)

Labify is designed to run on a central server with remote clients (lab members) connecting via browser.

### One-command deployment

```bash
./scripts/deploy.sh
```

This interactive script will:
1. Ask for your public domain or IP (e.g. `labify.yourlab.com`)
2. Ask for ports, JWT secret, and optional email (SMTP) settings
3. Write a `.env` file with all configuration
4. **Rebuild Docker images from scratch** (`--build`) and start everything

After it finishes, open the printed URL in your browser.

### What the script configures

| Prompt | Default | Purpose |
|--------|---------|---------|
| Domain or IP | — | Public address clients use (`APP_URL`, `CORS_ORIGIN`) |
| Frontend port | `8080` | Host port for nginx |
| API port | `3000` | Host port for direct API access (also proxied through nginx at `/api/`) |
| Bind IP | `0.0.0.0` | `0.0.0.0` = accessible from any network interface |
| JWT secret | auto-generated | Signs authentication tokens |
| Email service | skip | Gmail, Outlook, SendGrid, or custom SMTP for notifications |

### Update / redeploy

To pull code changes and recreate images:

```bash
git pull
./scripts/deploy.sh
```

Or manually:
```bash
docker compose up --build -d
```

> ⚠️ **Always use `--build`** so Docker picks up source changes. Without it, old cached layers are reused.

### Manual Docker Compose (without the script)

```bash
# 1. Create .env from the example
cp .env.example .env
# 2. Edit .env with your settings
nano .env
# 3. Build and start
docker compose up --build -d
```

Then open the URL you set in `APP_URL`.

### Behind a reverse proxy (nginx, Traefik, Caddy)

If you already have a reverse proxy handling HTTPS:

1. Set `APP_URL=https://labify.yourlab.com` and `CORS_ORIGIN=https://labify.yourlab.com`
2. Point your reverse proxy to `http://localhost:8080` (the Labify nginx container)
3. Optionally leave the API port empty so the API is only reachable through the proxy:
   ```bash
   API_PORT=  ./scripts/deploy.sh
   ```

### Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DOMAIN` | ✅ | Public domain or IP |
| `APP_URL` | ✅ | Full URL with protocol (`https://…` or `http://…`) |
| `CORS_ORIGIN` | ✅ | Same as `APP_URL` — restricts API access to your frontend |
| `LISTEN` / `HOST` | — | Bind IP (`0.0.0.0` for public, `127.0.0.1` for localhost-only) |
| `PORT` | — | Frontend host port |
| `API_PORT` | — | API host port (set empty to hide API behind nginx only) |
| `JWT_SECRET` | ✅ | Long random string for signing tokens |
| `EMAIL_SERVICE` | — | `gmail`, `outlook365`, `sendgrid` … |
| `SMTP_HOST` | — | Custom SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password / app password |
| `FROM_EMAIL` | — | Sender address |

### Data persistence

All data lives in a Docker volume (`labify-data`) mounted at `/data` inside the API container. Updating the image is safe — the SQLite database is preserved.

---

## ☁️ WebDAV Cloud Sync Setup

### Build & run

```bash
# Using Docker Compose (recommended)
docker compose up -d

# Or plain Docker
docker build -t labify .
docker run -d -p 8080:80 --name labify --restart unless-stopped labify
```

Then open http://localhost:8080.

### Custom IP / port (Docker Compose)

`docker-compose.yml` supports three environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTEN` | `0.0.0.0` | IP that **nginx binds to** inside the container |
| `HOST`   | `0.0.0.0` | IP that Docker publishes the port on (host side) |
| `PORT`   | `8080`    | Host port mapped to the container |

Examples:

```bash
# Default — accessible from any device on the network
PORT=8080 docker compose up -d

# Bind only to localhost (safer, no LAN exposure)
HOST=127.0.0.1 docker compose up -d

# Custom host IP + port
HOST=192.168.1.5 PORT=3000 docker compose up -d

# Make nginx listen on a specific internal interface
# (useful with network_mode: host or custom Docker networks)
LISTEN=192.168.1.5 docker compose up -d
```

> You can also create a `.env` file in the project root so the values persist:
> ```
> LISTEN=0.0.0.0
> HOST=0.0.0.0
> PORT=8080
> ```

### Update without data loss

Because Labify stores all data in the **browser's IndexedDB** (not on the server), updating the Docker image is completely safe:

```bash
docker compose pull   # if pulling from a registry
docker compose up -d  # recreate container — user data stays in the browser
```

> ⚠️ Make sure **WebDAV sync is enabled** in Settings so your data is backed up to the cloud before any major browser or device change.

---

## 🛡 Safe Updates & Database Migrations

Labify ships with a **non-destructive IndexedDB migration strategy**.

- **Automatic backups** — whenever the database schema version changes, Labify first exports all existing object stores into `localStorage` before touching the schema.
- **No store deletion on upgrade** — missing object stores are created, but existing ones are never blindly dropped. This prevents data loss when the app updates.
- **Manual export / import** — the `db.exportAll()` and `db.importAll()` APIs are available for full-database JSON backup/restore.

### Rolling back a bad migration

If an update ever corrupts data, open DevTools → Application → Local Storage and look for the key `labify-migration-backup-v<oldVersion>`. It contains a JSON snapshot of every store taken right before the schema change.

---

## ☁️ WebDAV Cloud Sync Setup

1. Open **Settings** (gear icon in sidebar footer)
2. Enter your WebDAV endpoint, e.g.:
   - Nextcloud: `https://cloud.example.com/remote.php/dav/files/username/`
   - Any WebDAV server: `https://dav.example.com/`
3. Fill in username + password (or token)
4. Click **Test** to verify, then **Save**

Sync is **automatic** — every add/edit/delete triggers a backup to `labify-backup.json` on your WebDAV server within ~800ms.

---

## 🧪 Adding Experiments from Literature

Labify is designed for reproducible research. To add an experiment from a paper:

1. Add all materials to the catalog (with units, supplier links, images)
2. Add required instruments
3. Create a new experiment, assign materials + quantities + units
4. Link external documents (URLs) or upload PDFs
5. Export as Excel for your lab notebook

---

## 📝 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Pure CSS (no UI framework) — teal/cyan accent palette |
| Storage | IndexedDB (`LabifyDB`, versioned schema) |
| Sync | WebDAV (custom client with `markDirty` debounce) |
| Export | `xlsx` library |
| Icons | Lucide React |
| Deployment | Docker + Nginx (SPA) |

---

## 🎯 Design Decisions

- **No external UI library** — keeps the bundle small and styling fully customizable
- **IndexedDB > localStorage** — handles large attachments (base64 images/documents) and structured queries
- **Catalog vs. Stock split** — `Material` = catalog entry only; `Order` = pending procurement; `InventoryItem` = received stock. This prevents stale quantities in the catalog.
- **Experiment IDs are deterministic** — `EXP-YYYYMMDD-NN` format for easy lab notebook reference
- **Cost calculation** — `Σ(materialQty × price) + Σ(instrumentQty × price)` gives real-time experiment budget estimates

---

## 🔌 REST API

Labify now ships with a **REST API** so external systems (scripts, ELN integrations, lab robots) can push and pull data.

### Quick start (local)

```bash
# Terminal 1 — start the API server
npm run server:dev

# Terminal 2 — start the React dev server
npm run dev
```

The API listens on `http://localhost:3000` by default.

### Docker Compose

The `api` service is included automatically:

```bash
docker compose up -d   # frontend on :8080, API on :3000
```

### Authentication

All data endpoints require a **Bearer token**. Obtain one by registering and logging in.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/auth/register` | — | — | Create account (sends verification email) |
| `GET /api/auth/verify?token=…` | — | — | Verify email address |
| `POST /api/auth/resend` | — | — | Resend verification email |
| `POST /api/auth/login` | — | — | Obtain JWT token |
| `GET /api/auth/me` | Bearer | ✅ | Current user info |

### Data endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/suppliers` | GET, POST | List / create suppliers |
| `/api/suppliers/:id` | GET, PATCH, DELETE | Supplier by ID |
| `/api/materials` | GET, POST | List / create materials |
| `/api/materials/:code` | GET, PATCH, DELETE | Material by code |
| `/api/instruments` | GET, POST | List / create instruments |
| `/api/instruments/:code` | GET, PATCH, DELETE | Instrument by code |
| `/api/experiments` | GET, POST | List / create experiments |
| `/api/experiments/:id` | GET, PATCH, DELETE | Experiment by ID |
| `/api/orders` | GET, POST | List / create orders |
| `/api/orders/:id` | GET, PATCH, DELETE | Order by ID |
| `/api/inventory` | GET, POST | List / create inventory items |
| `/api/inventory/:id` | GET, PATCH, DELETE | Inventory item by ID |
| `/api/backup` | GET | Full database JSON dump |
| `/api/restore` | POST | Bulk import from JSON |

### Example: add a material with curl

```bash
# 1. Login and grab token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@lab.com","password":"secret"}' | jq -r '.token')

# 2. Create a supplier
curl -X POST http://localhost:3000/api/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"sigma","name":"Sigma-Aldrich","webpage":"https://www.sigmaaldrich.com"}'

# 3. Create a material
curl -X POST http://localhost:3000/api/materials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"HCl-37","name":"Hydrochloric acid 37%","supplier_id":"sigma","link":"https://www.sigmaaldrich.com/HCl","price":15.5,"consumable":true,"unit":"mL"}'

# 4. List all materials
curl http://localhost:3000/api/materials \
  -H "Authorization: Bearer $TOKEN"
```

### Email verification

During registration the API sends a verification email. Configure SMTP via environment variables:

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | Port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |
| `FROM_EMAIL` | Sender address |
| `APP_URL` | Frontend URL for verification links |

If SMTP is **not configured**, the verification link is printed to the server console so you can still test locally.

### Environment variables

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

> ⚠️ **Production checklist**
> - Change `JWT_SECRET` to a long random string
> - Configure SMTP for real email delivery
> - Use HTTPS for `APP_URL`
> - Run behind a reverse proxy with TLS

---

## 📄 License

MIT © 2025

---

## 🤝 Contributing

Pull requests welcome! Good first issues:
- Add barcode/QR scanning for inventory
- Add experiment templates (clone from existing)
- Add local PDF viewer for attachments
- Dark-mode-aware chart visualizations
- PWA manifest + service worker for offline install

---

*Built for scientists who need their lab data to stay organized, portable, and fully under their control.* 🔬
