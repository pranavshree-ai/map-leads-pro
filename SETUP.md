# SETUP — MapsLead Studio Pro

This guide sets up the whole system **on your computer** from scratch. Total time: ~3 minutes.

---

## 0. Prerequisites

Install these first:

| Tool | Why | Get it |
|---|---|---|
| **Docker Desktop** | runs the scraper engine and web UI | https://www.docker.com/products/docker-desktop |
| **Python 3** *(optional)* | only if you want to use the CLI scripts | https://www.python.org |
| **git** *(optional)* | to sync code with GitHub | https://git-scm.com |

Verify Docker is running:
```bash
docker --version        # should print a version
docker ps               # should NOT error (means the daemon is up)
```

> **Platform notes:**
> - **Apple Silicon (M1/M2/M3):** the scraper image is `linux/amd64` and runs under emulation. If the
>   container won't start, uncomment the `platform: linux/amd64` line in `docker-compose.yml`.
> - **Windows:** use `scripts/scrape.py` (run with `py` or `python3`). The bash script `scrape.sh` needs
>   **WSL2** or **Git Bash**.

---

## 1. Get started

Open this project directory:
```bash
cd google-maps-scraper-kit
```

Create your local config (optional — defaults work as-is):
```bash
cp .env.example .env
```

---

## 2. Start the scraper & Web UI

```bash
docker compose up -d
```

First run pulls the scraping container and builds the Web UI (~once). When it finishes:

```bash
docker ps | grep gmaps-scraper          # should show it "Up"
curl http://localhost:8080/api/v1/jobs  # should print [] (empty list) or existing jobs
```

You can now open the Web UI in your browser:
- Web Studio: **http://localhost:8080**
- API docs: **http://localhost:8080/api/docs**

✅ If the browser loads or `curl` returns a JSON array, the system is live.

---

## 3. Using the Interactive Web UI Studio 🌐

Open **[http://localhost:8080](http://localhost:8080)** in your browser:

1. **Target Location:** Type a city name (e.g. *"Austin, TX"*) or click a city preset chip. Coordinates are automatically resolved.
2. **Business Niches:** Enter keywords or click quick-tag presets (*Coffee Shops*, *Dentists*, *Roofers*, etc.).
3. **Configure Options:** Adjust the depth slider, toggle Email extraction, Social media detection, or Fast mode.
4. **Launch Mission:** Click **"Launch Scrape Mission"**.
5. **Explore Leads:** When the job finishes, click **`👁️ Explore`** in the Operations Pipeline to view, search, filter, and export leads in CSV or JSON.

---

## 4. Run scrapes from the Command Line (CLI) 💻

Use the included Python script (uses standard library only, zero pip dependencies):

```bash
# Auto-geocodes the city name
python scripts/scrape.py "cafes in Austin TX" --city "Austin, TX" --depth 5

# Or pass coordinates directly: "<keyword>" <lat> <lon> [depth]
python scripts/scrape.py "gyms in Miami FL" 25.7617 -80.1918 --depth 5
```

The script will **create the job → poll until done → download the CSV → print a summary** and save
the full results to a file.

**Batch Scraping** (one job, many keywords) from a file:
```bash
python scripts/scrape.py --keywords-file examples/queries.example.txt --city "Denver, CO"
```

---

## 5. Stop / clean up

```bash
docker compose stop      # pause (keeps data + image)
docker compose down      # stop containers (keeps named volumes/data)
docker compose down -v   # ALSO delete scraped data volumes (full reset)
```

Delete old jobs via API to free disk space:
```bash
curl -X DELETE http://localhost:8080/api/v1/jobs/<job-id>
```

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `curl: connection refused` on :8080 | Container not up. `docker compose up -d`, then `docker ps`. |
| `422 missing max time` | Job body needs `max_time` (in **seconds**, e.g. `300`). |
| `422 missing geo coordinates` | Job body needs `lat` and `lon` as **strings**, e.g. `"30.2672"`. |
| Job stuck `working` forever | Lower `depth`, or the IP is being throttled by Google — wait, or add proxies. |
| Empty CSV | Keyword too narrow or wrong geo — widen `radius` or fix `lat`/`lon`. |
| Docker build is slow | Normal on first run; it caches after that. |

---

## 7. Best practices & safety (summary)

- **Always** send `max_time` (seconds) and `lat`/`lon` (strings).
- Start with **low `depth`** (5) and **one job at a time**. Raise only when needed.
- Turn on **email extraction** only when you need emails — it visits websites, so it takes more time.
- For big jobs, add **proxies** (the scraper has built-in rotation) to avoid IP blocks.
- Scraped **phones/emails are personal data** — comply with GDPR/CCPA/CAN-SPAM, and respect Google's ToS.
- Never commit result files (they're git-ignored for you).
