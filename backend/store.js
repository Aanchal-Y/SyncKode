/**
 * store.js — In-memory data store with JSON file persistence.
 * Persists to data/db.json on every write.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

/* ── Ensure data dir + seed ──────────────────────────────── */
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (_) { /* fall through */ }

  return {
    users: [],
    rooms: [
      {
        id: 'nexus-hackathon',
        name: 'SyncKode Hackathon — Build with AI',
        description: 'Global 48-hour hackathon. Build the future with AI-assisted tools.',
        languages: ['Python', 'TypeScript', 'React', 'Rust'],
        privacy: 'public',
        ownerId: null,
        members: [],
        code: '// Welcome to the SyncKode Hackathon!\n// Start coding together...\n',
        language: 'javascript',
        createdAt: new Date().toISOString(),
        featured: true,
      },
      {
        id: 'react-workshop',
        name: 'React 19 Deep Dive Workshop',
        description: 'Exploring Server Components, concurrent features & the new compiler.',
        languages: ['React', 'TypeScript', 'Next.js'],
        privacy: 'public',
        ownerId: null,
        members: [],
        code: 'import React from "react";\n\nexport default function App() {\n  return <h1>Hello SyncKode!</h1>;\n}\n',
        language: 'javascript',
        createdAt: new Date().toISOString(),
        featured: false,
      },
      {
        id: 'python-ml',
        name: 'Python ML & LLM Playground',
        description: 'Fine-tuning models, RAG pipelines, and agentic workflows.',
        languages: ['Python', 'PyTorch', 'LangChain'],
        privacy: 'public',
        ownerId: null,
        members: [],
        code: '# SyncKode Python ML Playground\nimport torch\nprint("CUDA available:", torch.cuda.is_available())\n',
        language: 'python',
        createdAt: new Date().toISOString(),
        featured: false,
      },
    ],
  };
}

let db = loadDB();

function saveDB() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[store] save error:', e.message);
  }
}

/* ── User helpers ────────────────────────────────────────── */
const users = {
  findById:       (id)         => db.users.find(u => u.id === id) || null,
  findByEmail:    (email)      => db.users.find(u => u.email === email?.toLowerCase()) || null,
  findByGithubId: (githubId)   => db.users.find(u => u.githubId === githubId) || null,

  create(data) {
    const user = {
      id:             require('uuid').v4(),
      email:          data.email?.toLowerCase() || null,
      password:       data.password || null,
      name:           data.name || 'Coder',
      username:       data.username || data.name?.toLowerCase().replace(/\s+/g, '_') || 'coder',
      avatar:         data.avatar || null,
      bio:            data.bio || '',
      githubId:       data.githubId || null,
      githubUsername: data.githubUsername || null,
      createdAt:      new Date().toISOString(),
    };
    db.users.push(user);
    saveDB();
    return user;
  },

  update(id, fields) {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...fields };
    saveDB();
    return db.users[idx];
  },

  delete(id) {
    db.users = db.users.filter(u => u.id !== id);
    saveDB();
  },
};

/* ── Room helpers ────────────────────────────────────────── */
const rooms = {
  all:      ()     => db.rooms,
  findById: (id)   => db.rooms.find(r => r.id === id) || null,

  create(data) {
    const room = {
      id:          data.id || require('uuid').v4().slice(0, 8),
      name:        data.name,
      description: data.description || '',
      languages:   data.languages || [],
      privacy:     data.privacy || 'public',
      ownerId:     data.ownerId || null,
      members:     [],
      code:        data.code || '// Start coding here...\n',
      language:    data.language || 'javascript',
      createdAt:   new Date().toISOString(),
      featured:    false,
    };
    db.rooms.push(room);
    saveDB();
    return room;
  },

  update(id, fields) {
    const idx = db.rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.rooms[idx] = { ...db.rooms[idx], ...fields };
    saveDB();
    return db.rooms[idx];
  },

  addMember(roomId, userId) {
    const room = this.findById(roomId);
    if (!room) return;
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      saveDB();
    }
  },

  removeMember(roomId, userId) {
    const room = this.findById(roomId);
    if (!room) return;
    room.members = room.members.filter(id => id !== userId);
    saveDB();
  },

  delete(id) {
    db.rooms = db.rooms.filter(r => r.id !== id);
    saveDB();
  },
};

module.exports = { users, rooms };
