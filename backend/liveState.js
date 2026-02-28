'use strict';

/**
 * liveState.js — Shared in-memory runtime state.
 * NOT persisted. Resets on server restart.
 *
 * roomSessions : roomId → Map<socketId, { socketId, userId, name, avatar, color }>
 * voiceRooms   : roomId → Map<socketId, { socketId, userId, name }>
 */

const roomSessions = new Map();
const voiceRooms   = new Map();

module.exports = { roomSessions, voiceRooms };
