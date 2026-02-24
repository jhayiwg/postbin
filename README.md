# Postbin

A lightweight, modern, local HTTP request capture server designed to let you inspect webhook payloads and API integrations directly on your machine.
It acts exactly like Webhook.site or RequestBin but runs completely locally, storing logs in SQLite so they survive restarts.

## Features

- **Dynamic Endpoints**: Simply send requests to `localhost:5555/{any-app-name}` and it's captured instantly.
- **Beautiful UI Dashboard**: View all requests via an elegant dark-mode UI with live stream updates at `localhost:5555//manage/{any-app-name}`.
- **Background Daemon**: Runs entirely in the background using native node detached processes.
- **Persistent Storage**: Utilizes `better-sqlite3` to store logs efficiently.
- **Privacy First**: Completely local, your sensitive webhook data never leaves your machine.

---

## 🚀 Installation & Usage

### 1. Requirements

- Node.js (v18+)
- SQLite3

### 2. Setup

Clone the repository and install dependencies:

```bash
git clone <repository>
cd postbin
npm install
npm run build
npm link
```

_(Note: `npm link` allows you to run `postbin` globally from your terminal)_

### 3. CLI Commands

The project is wrapped in a convenient CLI tool:

```bash
postbin start             # Starts the capture server in the background (default port 5555)
postbin start --port 8080 # Starts the server on a custom port
postbin stop              # Stops the background server
postbin restart           # Restarts the server
postbin status            # Check if the server is actively running
postbin logs              # Tails the server logs in real-time
```

---

## 🎯 How to Use

### Capturing Requests

Simply point your webhook or API integration to the server using any "slug" or identifier you want. The server catches **any HTTP method** and **any sub-path**.

```bash
# Basic capture
curl -X POST http://localhost:5555/stripe-webhooks -d '{"status": "paid"}'

# Deep nested path capture
curl -X GET "http://localhost:5555/github/repo/push/events?secret=123"

# Capture with headers
curl -X PUT http://localhost:5555/my-app -H "Authorization: Bearer test" -d "Raw text payload"
```

### Viewing Requests (UI)

To view the beautifully styled dashboard for a specific application/slug, just append the app slug to `/manage/` in your browser:

👉 **http://localhost:5555/manage/stripe-webhooks**

_(The UI uses Server-Sent Events to update instantly as soon as a new request hits your endpoints without refreshing)._

---

## 🐳 Docker Support & Database Access

All captured requests are stored locally inside the `./data/postbin.db` SQLite database file. You can connect to this database file using any standard SQLite GUI viewer (e.g., DBeaver, TablePlus, DB Browser for SQLite) or connect directly from another application.

### Connecting to the SQLite DB

The schema is simple:

```sql
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    app_slug TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT NOT NULL,      -- Stored as JSON string
    query_params TEXT NOT NULL, -- Stored as JSON string
    body TEXT,                  -- Stored as string
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Query Example**:

```sql
SELECT method, url, created_at FROM requests WHERE app_slug = 'stripe-webhooks' ORDER BY created_at DESC;
```

### Requesting from a site inside Docker

If you are running an application inside a Docker container and need it to send webhooks/requests to your local Postbin server running on your host machine, you cannot use `localhost` because `localhost` inside Docker refers to the container itself.

Instead, route your requests to the special host-gateway address:

- **Mac / Windows (Docker Desktop)**: Use `http://host.docker.internal:5555/myapp`
- **Linux**: Use `http://172.17.0.1:5555/myapp` (or the IP address of your `docker0` bridge).

For example, inside a python script running in a docker container:

```python
import requests

# Send payload from docker container to host machine's Postbin server
response = requests.post(
    "http://host.docker.internal:5555/my-docker-app",
    json={"event": "container_started"}
)
```
