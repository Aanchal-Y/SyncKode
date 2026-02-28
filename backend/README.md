# SyncKode Backend

Express + Socket.io backend for the SyncKode collaborative code editor.

## Stack

| Layer | Tech |
|---|---|
| HTTP Server | Express 4.x |
| Auth | Passport.js (GitHub OAuth2 + email/password) |
| Real-time | Socket.io 4.x |
| Session | express-session (7-day cookie) |
| Data | In-memory + JSON file at `data/db.json` |

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example env file:

```bash
copy .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
SESSION_SECRET=change-this-to-a-long-random-string

GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

### 3. Create a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: SyncKode (or anything you like)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID** → paste into `GITHUB_CLIENT_ID` in `.env`
6. Click **"Generate a new client secret"** → paste into `GITHUB_CLIENT_SECRET` in `.env`

### 4. Start the server

```bash
npm start
```

You should see:

```
⚡ SyncKode server running → http://localhost:3000
GitHub OAuth callback → http://localhost:3000/auth/github/callback
```

Open http://localhost:3000 in your browser.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login with email + password |
| `GET` | `/auth/github` | Redirect to GitHub OAuth |
| `GET` | `/auth/github/callback` | GitHub OAuth callback |
| `GET/POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Current session user (401 if not logged in) |

### Rooms

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rooms` | List all rooms |
| `GET` | `/api/rooms/:id` | Get single room |
| `POST` | `/api/rooms` | Create room (auth required) |
| `PUT` | `/api/rooms/:id` | Update room (auth required) |
| `DELETE` | `/api/rooms/:id` | Delete room (auth required) |

### User

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/me` | Get own profile |
| `PUT` | `/api/user/profile` | Update name/username/bio/avatar |
| `PUT` | `/api/user/password` | Change password |

### Socket.io Events

**Client → Server:**

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, userId, name, avatar }` | Join a coding room |
| `leave-room` | `{ roomId, userId }` | Leave a room |
| `code-change` | `{ roomId, code, language }` | Broadcast code edit |
| `cursor-move` | `{ roomId, userId, line, ch }` | Broadcast cursor position |
| `chat-message` | `{ roomId, userId, name, text, time }` | Send chat message |
| `request-code` | `{ roomId }` | Request current code snapshot |

**Server → Client:**

| Event | Payload | Description |
|---|---|---|
| `room-joined` | `{ code, language, members }` | Joined room successfully |
| `user-joined` | `{ userId, name, avatar }` | Another user joined |
| `user-left` | `{ userId, name }` | Another user left |
| `code-update` | `{ code, language, userId }` | Code updated by peer |
| `cursor-update` | `{ userId, name, line, ch }` | Peer cursor moved |
| `chat-message` | `{ userId, name, text, time }` | Peer chat message |
| `room-members` | `[{ userId, name, avatar }]` | Full member list |

---

## Data Persistence

- Data is stored in memory during runtime
- Saved to `data/db.json` on every write operation
- On server restart, data is loaded from `db.json` automatically
- If `db.json` doesn't exist, the server starts with 3 seeded rooms

---

## Deployment Notes

For production:
- Set a strong `SESSION_SECRET`
- Update `GITHUB_CALLBACK_URL` to your real domain
- Consider replacing the JSON store with a real database (PostgreSQL, MongoDB, etc.)
- Use HTTPS (required for secure cookies and GitHub OAuth in production)
