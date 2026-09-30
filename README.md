# MapsLead Studio Pro

<p align="center">
  <img src="assets/banner.svg" alt="MapsLead Studio Pro — high-performance local Google Maps lead generation and scraper studio" width="100%">
</p>

<p align="center">
  <strong>High-performance local lead intelligence platform & interactive Google Maps business scraper.</strong>
</p>

<p align="center">
  <a href="#-user-interface-showcase">UI Showcase</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-cli--scripts">CLI & Scripts</a> •
  <a href="#-responsible-use--proxies">Proxies & Safety</a>
</p>

---

## 📸 User Interface Showcase

MapsLead Studio Pro features a custom-built, cyber-dark glassmorphic web dashboard with real-time scraping controls, dynamic geocoding, live mission tracking, and an in-browser Lead Intelligence Explorer.

### 1. Interactive Control Deck & Operations Pipeline
> Launch missions with smart city lookup, keyword presets, depth sliders, and enrichment toggles. Track running jobs in real time with animated status beacons.

<p align="center">
  <img src="assets/screenshots/dashboard.png" alt="MapsLead Studio Pro Web Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
</p>

### 2. In-Browser Lead Intelligence Explorer
> View, search, filter, and inspect qualified leads directly in your browser. Toggle between high-density table grids and glassmorphic card views with direct click-to-call, email, and one-click exports.

<p align="center">
  <img src="assets/screenshots/lead_explorer.png" alt="Interactive Lead Explorer Modal" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
</p>

---

## ⚡ What You Get

- 🌐 **Interactive Web UI Studio** — Open `http://localhost:8080/` for a state-of-the-art lead generation dashboard.
- 🎯 **Smart Auto-Geocoding** — Type any city or neighborhood (e.g. *"Austin, TX"*, *"Miami, FL"*), and coordinates resolve instantly via built-in geocoding.
- 📊 **In-Browser Lead Explorer** — Inspect scraped leads with key metrics (Total Places, Verified Emails %, Direct Phones %, Average Rating), live search, and filter chips.
- ⚡ **Contact Enrichment** — Extracts direct phones, visits websites to uncover verified decision-maker emails, and detects social profiles (Instagram, LinkedIn, Facebook).
- 📦 **Multi-Format Export** — Instant one-click exports to CSV, structured JSON, or copy formatted leads directly to clipboard.
- 🐳 **One-Command Local Docker Setup** — `docker compose up -d` spins up both the scraping engine and the modern UI gateway.
- 🛠️ **Zero-Dependency CLI Scripts** — `scripts/scrape.py` (Python standard library only) and `scripts/scrape.sh` (bash) for terminal power-users and cron automation.
- 🔒 **Private & Secure** — Runs 100% on your own machine, binds to `127.0.0.1` only, with zero external tracking or cloud subscription fees.

---

## 🚀 Quick Start

### 1. Start the Studio (Docker Desktop required)
```bash
docker compose up -d
```

### 2. Open the Interactive Web Studio
Navigate to **[http://localhost:8080](http://localhost:8080)** in your browser to launch scrapes and explore results.

### 3. Or Scrape from the Command Line
```bash
# Auto-geocodes city, extracts emails, and saves clean leads to CSV
python scripts/scrape.py "coffee shops in Austin TX" --city "Austin, TX" --depth 5

# Enrich leads with Instagram, Facebook & LinkedIn handles
python scripts/scrape.py "dentists in Denver CO" --city "Denver, CO" --socials
```

---

## 🛠️ Architecture

```mermaid
graph TD
    Browser["Client Browser (http://localhost:8080)"] --> UI["MapsLead Modern Web Server (Node.js Gateway)"]
    CLI["CLI Scripts (scrape.py, scrape.sh)"] --> UI
    UI -->|Static Assets & Glassmorphic UI| Browser
    UI -->|Reverse Proxy /api/v1/*| Engine["Scraper Engine (gmaps-scraper)"]
    UI -->|Smart Geocoding /api/geocode| OSM["OpenStreetMap Nominatim"]
    UI -->|Parsed Lead Stream /api/leads/:id| LeadParser["CSV-to-JSON Pipeline"]
    Engine --> DataVol[("Data Volume: /gmapsdata")]
```

- **`mapslead-ui` (Port 8080):** Serves the responsive, modern UI and acts as a unified API gateway. All existing REST API endpoints (`/api/v1/*`) are proxied directly to the engine for complete backward compatibility.
- **`gmaps-scraper` (Port 8081 / Internal):** High-performance headless browser automation engine that executes asynchronous scraping missions.

---

## 📋 Data Extracted

By default, MapsLead Studio extracts clean, actionable **lead generation fields** and strips extraneous geo blobs and internal IDs:

| Field | Description |
|---|---|
| **Title / Company** | Verified business name |
| **Phone** | Direct phone number with click-to-call link |
| **Emails** | Verified email addresses discovered from company websites |
| **Website** | Direct company homepage URL |
| **Category** | Primary business category (e.g. *Dental clinic*, *Coffee shop*) |
| **Address** | Formatted street address and location |
| **Review Rating** | Aggregate Google rating (e.g. `4.8 ★`) |
| **Review Count** | Total customer reviews |
| **Socials** *(Optional)* | Instagram, Facebook, and LinkedIn profile URLs |

---

## 💻 CLI & Scripts

The kit includes standalone scripts in `scripts/`:

### Single Query with Auto-Geocoding
```bash
python scripts/scrape.py "gyms in Miami FL" --city "Miami, FL" --depth 5
```

### Batch Scraping from Keywords File
```bash
python scripts/scrape.py --keywords-file examples/queries.example.txt --city "Denver, CO"
```

### CLI Arguments Reference
| Argument | Description | Default |
|---|---|---|
| `keyword` | Search term (e.g. `"plumbers in Phoenix"`) | None |
| `--city` | City name for auto-geocoding | None |
| `lat lon` | Manual latitude and longitude coordinates | Optional |
| `--depth` | Scroll depth (approx. 5–10 places per depth) | `5` |
| `--no-email` | Skip email extraction for ultra-fast scraping | Emails ON |
| `--socials` | Discover Instagram, Facebook & LinkedIn handles | `false` |
| `--max-time` | Job timeout limit in seconds | `600` |
| `--out` | Custom output file path (`.csv` or `.json`) | `results-<id>.csv` |
| `--json` | Output structured JSON instead of CSV | `false` |
| `--full` | Retain all 34 raw columns | `false` |

---

## 🛡️ Responsible Use & Proxies

This system interacts directly with Google Maps. Light and moderate usage works out-of-the-box. For high-volume scrapes, multiple back-to-back jobs, or deep crawls, observe these best practices:

- **Start with Depth 5:** A depth of 5 typically yields 25–50 high-quality listings per keyword.
- **One Job at a Time:** Avoid flooding concurrent jobs on a single residential IP.
- **Adding Proxies:** For large jobs or scheduled runs, provide proxies in the Web Studio or pass via job parameters:
  ```json
  "proxies": [
    "http://user:pass@proxy1.example.com:8080",
    "socks5://127.0.0.1:9050"
  ]
  ```
  Supported protocols: `http`, `https`, `socks5`, `socks5h`. The scraping engine automatically rotates through the list.

---

## 📁 Repository Structure

```
google-maps-scraper-kit/
├── assets/
│   ├── banner.svg             ← product branding banner
│   └── screenshots/           ← dashboard & Lead Explorer screenshots
│       ├── dashboard.png
│       └── lead_explorer.png
├── web/                       ← Modern Interactive Web UI Studio
│   ├── Dockerfile             ← UI service container
│   ├── package.json
│   ├── server.js              ← Node.js API gateway, geocoder & lead parser
│   └── public/
│       ├── index.html         ← semantic dashboard layout
│       ├── css/style.css      ← cyber-dark glassmorphic design system
│       └── js/app.js          ← reactive UI, filters, sorting & exports
├── docker-compose.yml         ← orchestrates scraper engine & web studio
├── scripts/
│   ├── scrape.py              ← Python CLI scraper with auto-geocoding
│   └── scrape.sh              ← lightweight bash scraper
├── examples/
│   ├── queries.example.json   ← reference configuration & coordinate cheatsheet
│   └── queries.example.txt    ← batch keyword list
├── SETUP.md                   ← detailed step-by-step setup guide
├── CLAUDE.md                  ← AI pair programming instructions
├── CREDITS.md                 ← open-source notices
└── LICENSE                    ← MIT License
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) and [`CREDITS.md`](CREDITS.md) for details.
Please respect Google's Terms of Service and applicable privacy regulations (GDPR, CCPA, CAN-SPAM) when using contact data.
