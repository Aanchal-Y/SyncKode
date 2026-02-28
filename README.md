<div align="center">

# ⚡ SyncKode

**Real-time collaborative code editor — code together, ship faster.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io)](https://socket.io)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖊️ **Real-time Collaborative Editing** | Multiple users edit the same file simultaneously with live sync via Socket.io |
| 👆 **Live Cursors** | See where every collaborator's cursor is in real time |
| 🎙️ **Voice Chat** | In-room WebRTC voice communication — no external tools needed |
| 🖥️ **Integrated Terminal** | Run code directly in the browser — supports **20+ languages** |
| 🤖 **NexusAI Assistant** | AI-powered code assistant (Groq — llama-3.3-70b) embedded in every room |
| 📸 **Code Snapshots** | Snapshot the editor state and share/discuss in the room chat |
| 🔐 **Auth** | Email/password sign-up + login, session-based |
| 🚪 **Rooms** | Create named rooms, share link, collaborate instantly |

---

## 🗂️ Project Structure

```
SyncKode/
├── index.html          # Landing / home page
├── rooms.html          # Room browser
├── room.html           # Main collaborative editor (single-page app)
├── profile.html        # User profile
├── css/
│   └── styles.css
├── js/
│   └── room.js
└── backend/
    ├── server.js       # Express entry point
    ├── socket.js       # All Socket.io events (collab, terminal, voice, AI)
    ├── passport.js     # Auth strategies
    ├── liveState.js    # In-memory room state
    ├── store.js        # Session store
    ├── .env            # Environment variables (see below)
    └── routes/
        ├── auth.js     # /api/auth/*
        ├── rooms.js    # /api/rooms/*
        └── ai.js       # /api/ai/chat  (Groq streaming)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- npm

### 1 — Clone the repo

```bash
git clone https://github.com/Aanchal-Y/SyncKode.git
cd SyncKode
```

### 2 — Install backend dependencies

```bash
cd backend
npm install
```

### 3 — Environment variables

The `.env` file is already included. It contains:

```env
PORT=3000
SESSION_SECRET=synckode-dev-secret-2026-change-in-prod
GROQ_API_KEY=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
```

> **Note:** The Groq API key above is the development key. For production, replace it with your own from [console.groq.com](https://console.groq.com).

### 4 — Run the server

```bash
# from the backend/ directory
node server.js

# or with auto-reload
npx nodemon server.js
```

Server starts at **http://localhost:3000**

### 5 — Open the app

Open `index.html` directly in your browser **or** serve the root folder with any static server and point it to the backend on port 3000.

---

## 🖥️ Integrated Terminal — Supported Languages

The in-browser terminal compiles and runs code on the server. Runtimes must be installed on the machine running the backend.

| Language | Runtime needed |
|---|---|
| JavaScript | Node.js |
| TypeScript | Node.js |
| Python | python / python3 |
| Go | go |
| Java | javac + java (JDK) |
| C | gcc |
| C++ | g++ |
| Rust | rustc |
| PHP | php |
| Ruby | ruby |
| Bash / Shell | bash |
| PowerShell | powershell |
| Lua | lua |
| R | Rscript |
| Kotlin | kotlinc |
| Swift | swift |
| Perl | perl |

---

## 🤖 NexusAI — Groq-Powered Assistant

Every room has a built-in AI assistant powered by **Groq** (`llama-3.3-70b-versatile`).

- Ask questions about the code in the editor
- Snapshot the editor → AI automatically explains it
- Streaming responses rendered in real time

API endpoint: `POST /api/ai/chat`

```json
{
  "message": "Explain this code",
  "code": "...",
  "language": "python",
  "roomName": "my-room"
}
```

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `join-room` | client → server | Join a collaboration room |
| `code-change` | bidirectional | Sync editor content |
| `cursor-update` | bidirectional | Live cursor position |
| `chat-message` | bidirectional | Room chat |
| `terminal:run` | client → server | Run code / command |
| `terminal:input` | client → server | Send stdin to running process |
| `terminal:kill` | client → server | Kill running process (Ctrl+C) |
| `terminal:output` | server → client | stdout / stderr stream |
| `terminal:exit` | server → client | Process exit notification |
| `voice-signal` | bidirectional | WebRTC signaling for voice |

---

## 🛠️ Tech Stack

**Frontend:** Vanilla HTML/CSS/JS, CodeMirror (editor), Socket.io client, WebRTC  
**Backend:** Node.js, Express 4, Socket.io 4, Passport.js (local auth), bcryptjs, express-session  
**AI:** Groq Cloud API via OpenAI-compatible SDK — model `llama-3.3-70b-versatile`  
**Storage:** JSON file store (no database required for development)

---

## 📄 License

MIT © 2026 SyncKode Contributors
