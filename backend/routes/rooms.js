/**
 * routes/rooms.js — Room management endpoints
 *
 *  GET    /api/rooms          — list all public rooms
 *  GET    /api/rooms/:id      — single room (+ code snapshot)
 *  POST   /api/rooms          — create room (auth required)
 *  PUT    /api/rooms/:id      — update room meta (owner)
 *  DELETE /api/rooms/:id      — delete room (owner)
 */
'use strict';

const router            = require('express').Router();
const { v4: uuid }      = require('uuid');
const { rooms, users }  = require('../store');
const { roomSessions }  = require('../liveState');

/* ── Auth middleware ─────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required.' });
}

/* ── List public rooms ───────────────────────────────────── */
router.get('/', (req, res) => {
  const list = rooms.all().filter(r => r.privacy === 'public');

  // Attach owner display info
  const enriched = list.map(room => {
    const owner = room.ownerId ? users.findById(room.ownerId) : null;
    return {
      ...room,
      code: undefined,                      // don't send code on list
      ownerName:   owner?.name   || 'SyncKode',
      ownerAvatar: owner?.avatar || null,
      memberCount: roomSessions.has(room.id) ? roomSessions.get(room.id).size : 0,
    };
  });

  res.json(enriched);
});

/* ── Get single room ─────────────────────────────────────── */
router.get('/:id', (req, res) => {
  const room = rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.privacy === 'private' && !req.isAuthenticated())
    return res.status(403).json({ error: 'Private room — please sign in.' });

  const owner = room.ownerId ? users.findById(room.ownerId) : null;
  res.json({
    ...room,
    ownerName:   owner?.name   || 'SyncKode',
    ownerAvatar: owner?.avatar || null,
    memberCount: roomSessions.has(req.params.id) ? roomSessions.get(req.params.id).size : 0,
  });
});

/* ── Create room ─────────────────────────────────────────── */
router.post('/', requireAuth, (req, res) => {
  const { name, description, languages, privacy, language } = req.body;
  if (!name) return res.status(400).json({ error: 'Room name is required.' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uuid().slice(0, 5);

  const room = rooms.create({
    id:          slug,
    name,
    description: description || '',
    languages:   Array.isArray(languages) ? languages : [],
    privacy:     privacy === 'private' ? 'private' : 'public',
    language:    language || 'javascript',
    ownerId:     req.user.id,
  });

  res.status(201).json(room);
});

/* ── Update room ─────────────────────────────────────────── */
router.put('/:id', requireAuth, (req, res) => {
  const room = rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.ownerId && room.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Only the owner can update this room.' });

  const { name, description, languages, privacy } = req.body;
  const updated = rooms.update(req.params.id, {
    ...(name        && { name }),
    ...(description && { description }),
    ...(languages   && { languages }),
    ...(privacy     && { privacy }),
  });
  res.json(updated);
});

/* ── Delete room ─────────────────────────────────────────── */
router.delete('/:id', requireAuth, (req, res) => {
  const room = rooms.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.ownerId && room.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Only the owner can delete this room.' });

  rooms.delete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
