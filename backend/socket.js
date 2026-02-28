'use strict';

/**
 * socket.js — Socket.io real-time collaboration + WebRTC voice signaling
 *
 * Code collaboration events (client → server):
 *   join-room     { roomId, userId, name, avatar }
 *   leave-room    { roomId }
 *   code-change   { roomId, code, language }
 *   cursor-move   { roomId, line, col, userId, name, color }
 *   chat-message  { roomId, message, userId, name, avatar }
 *   request-code  { roomId }
 *
 * Voice signaling events (client → server):
 *   voice:join    { roomId }
 *   voice:leave   { roomId }
 *   voice:offer   { roomId, to, sdp }
 *   voice:answer  { roomId, to, sdp }
 *   voice:ice     { roomId, to, candidate }
 */

const { rooms }                    = require('./store');
const { roomSessions, voiceRooms } = require('./liveState');

const COLORS = [
  '#FFD700','#8B5CF6','#00D4FF','#00FF9F',
  '#FF6B1A','#FF2D78','#00BFFF','#7CFC00',
];
let colorIdx = 0;
function nextColor() { return COLORS[colorIdx++ % COLORS.length]; }

module.exports = function setupSocket(io) {

  io.on('connection', socket => {
    let currentRoomId = null;
    let sessionUser   = null;

    /* ── Join Room ──────────────────────────────────────── */
    socket.on('join-room', ({ roomId, userId, name, avatar }) => {
      if (!roomId) return;
      if (currentRoomId) _leaveRoom(currentRoomId);

      const room = rooms.findById(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found.' }); return; }

      currentRoomId = roomId;
      socket.join(roomId);

      sessionUser = {
        socketId: socket.id,
        userId:   userId || socket.id,
        name:     name   || 'Anonymous',
        avatar:   avatar || null,
        color:    nextColor(),
      };

      if (!roomSessions.has(roomId)) roomSessions.set(roomId, new Map());
      roomSessions.get(roomId).set(socket.id, sessionUser);

      if (userId) rooms.addMember(roomId, userId);

      socket.emit('room-joined', {
        roomId,
        code:     room.code     || '',
        language: room.language || 'javascript',
        members:  _memberList(roomId),
      });

      socket.to(roomId).emit('user-joined', sessionUser);
      io.to(roomId).emit('room-members', _memberList(roomId));
    });

    /* ── Code Change ────────────────────────────────────── */
    socket.on('code-change', ({ roomId, code, language }) => {
      if (!roomId) return;
      rooms.update(roomId, { code, ...(language && { language }) });
      socket.to(roomId).emit('code-update', {
        code, language,
        fromUserId: sessionUser?.userId,
      });
    });

    /* ── Cursor Move ────────────────────────────────────── */
    socket.on('cursor-move', (data) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('cursor-update', { ...data, color: sessionUser?.color });
    });

    /* ── Chat Message ───────────────────────────────────── */
    socket.on('chat-message', (data) => {
      const rid = data.roomId || currentRoomId;
      if (!rid) return;
      io.to(rid).emit('chat-message', { ...data, timestamp: new Date().toISOString() });
    });

    /* ── Request current code ───────────────────────────── */
    socket.on('request-code', ({ roomId }) => {
      const room = rooms.findById(roomId);
      if (room) socket.emit('code-update', { code: room.code || '', language: room.language || 'javascript' });
    });

    /* ══ Voice signaling (WebRTC) ═══════════════════════════ */

    socket.on('voice:join', ({ roomId }) => {
      if (!roomId) return;
      if (!voiceRooms.has(roomId)) voiceRooms.set(roomId, new Map());
      const vRoom = voiceRooms.get(roomId);

      // Send existing voice users to new joiner → they will initiate offers to each
      socket.emit('voice:current-users', Array.from(vRoom.values()));

      // Notify existing voice users → they create peer conn (wait for offer)
      socket.to(roomId).emit('voice:user-joined', {
        socketId: socket.id,
        userId:   sessionUser?.userId,
        name:     sessionUser?.name || 'Anonymous',
      });

      vRoom.set(socket.id, {
        socketId: socket.id,
        userId:   sessionUser?.userId,
        name:     sessionUser?.name || 'Anonymous',
      });
    });

    socket.on('voice:leave', ({ roomId }) => _leaveVoice(roomId));

    // Forward SDP offer directly to target peer
    socket.on('voice:offer',  ({ to, sdp })       => io.to(to).emit('voice:offer',  { from: socket.id, sdp }));
    socket.on('voice:answer', ({ to, sdp })       => io.to(to).emit('voice:answer', { from: socket.id, sdp }));
    socket.on('voice:ice',    ({ to, candidate }) => io.to(to).emit('voice:ice',    { from: socket.id, candidate }));

    /* ── Disconnect ─────────────────────────────────────── */
    socket.on('disconnect', () => {
      if (currentRoomId) {
        _leaveVoice(currentRoomId);
        _leaveRoom(currentRoomId);
      }
    });

    /* ── Terminal ───────────────────────────────────────────── */
    const { spawn } = require('child_process');
    const fs   = require('fs');
    const path = require('path');
    const os   = require('os');
    const tmpDir = os.tmpdir();

    // Language → { ext, cmd(file), altCmd } map
    const LANG_MAP = {
      javascript:  { ext: 'js',   cmd: f => ['node', [f]] },
      typescript:  { ext: 'ts',   cmd: f => ['node', ['--input-type=module', f]],
                     pre: c => c.replace(/:\s*(string|number|boolean|any|void|never|unknown|object|null|undefined)(\[\])?\s*(?=[,)=;{<\n])/g,'')
                                 .replace(/<[A-Z][A-Za-z0-9]*>/g,'')
                                 .replace(/^(export\s+)?(interface|type)\s+\w[\s\S]*?\n}/gm,'')
                                 .replace(/^export\s+/gm,'') },
      tsx:         { ext: 'js',   cmd: f => ['node', [f]],
                     pre: c => c.replace(/:\s*(string|number|boolean|any|void|never|unknown|object)(\[\])?\s*(?=[,)=;{<\n])/g,'')
                                 .replace(/<[A-Z][A-Za-z0-9]*>/g,'').replace(/^export\s+/gm,'') },
      jsx:         { ext: 'js',   cmd: f => ['node', [f]] },
      python:      { ext: 'py',   cmd: f => [process.platform==='win32'?'python':'python3', [f]] },
      python3:     { ext: 'py',   cmd: f => [process.platform==='win32'?'python':'python3', [f]] },
      go:          { ext: 'go',   cmd: f => ['go', ['run', f]] },
      java:        { ext: 'java', cmd: f => {
                       // extract class name from code stored as global below
                       const dir = path.dirname(f);
                       return ['bash', ['-c', `cd "${dir}" && javac "${f}" && java -cp "${dir}" $(basename "${f}" .java)`]];
                     }},
      c:           { ext: 'c',   cmd: f => {
                       const out = f.replace('.c','');
                       return process.platform==='win32'
                         ? ['cmd',['/c',`gcc "${f}" -o "${out}.exe" && "${out}.exe"`]]
                         : ['bash',['-c',`gcc "${f}" -o "${out}" && "${out}"`]];
                     }},
      'c++':       { ext: 'cpp', cmd: f => {
                       const out = f.replace('.cpp','');
                       return process.platform==='win32'
                         ? ['cmd',['/c',`g++ "${f}" -o "${out}.exe" && "${out}.exe"`]]
                         : ['bash',['-c',`g++ "${f}" -o "${out}" && "${out}"`]];
                     }},
      cpp:         { ext: 'cpp', cmd: f => {
                       const out = f.replace('.cpp','');
                       return process.platform==='win32'
                         ? ['cmd',['/c',`g++ "${f}" -o "${out}.exe" && "${out}.exe"`]]
                         : ['bash',['-c',`g++ "${f}" -o "${out}" && "${out}"`]];
                     }},
      rust:        { ext: 'rs',  cmd: f => {
                       const out = f.replace('.rs','');
                       return ['bash',['-c',`rustc "${f}" -o "${out}" && "${out}"`]];
                     }},
      php:         { ext: 'php', cmd: f => ['php', [f]] },
      ruby:        { ext: 'rb',  cmd: f => ['ruby', [f]] },
      bash:        { ext: 'sh',  cmd: f => ['bash', [f]] },
      shell:       { ext: 'sh',  cmd: f => ['bash', [f]] },
      powershell:  { ext: 'ps1', cmd: f => ['powershell', ['-ExecutionPolicy','Bypass','-File',f]] },
      lua:         { ext: 'lua', cmd: f => ['lua', [f]] },
      r:           { ext: 'r',   cmd: f => ['Rscript', [f]] },
      kotlin:      { ext: 'kts', cmd: f => ['kotlinc', ['-script', f]] },
      swift:       { ext: 'swift',cmd: f => ['swift', [f]] },
      perl:        { ext: 'pl',  cmd: f => ['perl', [f]] },
    };

    // Direct shell commands allowed
    const SAFE_CMD = /^(node|nodemon|npm|npx|python3?|go|java|javac|gcc|g\+\+|rustc|cargo|php|ruby|bash|sh|lua|Rscript|perl|swift|echo|dir|ls|pwd|cat|type|git|pip3?|mvn|gradle)\b/i;

    // Store running proc per socket for stdin/kill
    let _activeProc = null;

    socket.on('terminal:run', ({ code, language, command }) => {
      // Kill any previous running process
      if (_activeProc) { try { _activeProc.kill('SIGTERM'); } catch(_) {} _activeProc = null; }

      let proc;

      if (command) {
        if (!SAFE_CMD.test(command.trim())) {
          socket.emit('terminal:output', { data: `Permission denied: "${command.trim().split(' ')[0]}" is not in the allowed list.\nAllowed: node, python, go, java, gcc, g++, php, ruby, bash, git, pip, npm, npx…\n`, type: 'stderr' });
          socket.emit('terminal:exit', { code: 1 });
          return;
        }
        const parts = command.trim().split(/\s+/);
        proc = spawn(parts[0], parts.slice(1), { cwd: tmpDir, shell: process.platform === 'win32' });

      } else if (code) {
        const langKey = (language || 'javascript').toLowerCase().replace(/[^a-z0-9+]/g, '');
        const def = LANG_MAP[langKey] || LANG_MAP['javascript'];
        let src = typeof def.pre === 'function' ? def.pre(code) : code;

        // For Java, extract public class name for filename
        let filename = `sk_${socket.id}`;
        if (langKey === 'java') {
          const m = src.match(/public\s+class\s+(\w+)/);
          filename = m ? m[1] : 'Main';
        }
        const file = path.join(tmpDir, `${filename}.${def.ext}`);
        fs.writeFileSync(file, src, 'utf8');
        const [bin, args] = def.cmd(file);
        proc = spawn(bin, args, { cwd: tmpDir, shell: process.platform === 'win32' });
        proc.on('close', () => { try { fs.unlinkSync(file); } catch(_) {} });

      } else {
        socket.emit('terminal:exit', { code: 0 });
        return;
      }

      _activeProc = proc;
      proc.stdout.on('data', d => socket.emit('terminal:output', { data: d.toString(), type: 'stdout' }));
      proc.stderr.on('data', d => socket.emit('terminal:output', { data: d.toString(), type: 'stderr' }));
      proc.on('close', c => {
        _activeProc = null;
        socket.emit('terminal:exit', { code: c });
      });
      proc.on('error', e => {
        _activeProc = null;
        const hint = e.code === 'ENOENT'
          ? ` — "${e.path}" is not installed or not in PATH.`
          : '';
        socket.emit('terminal:output', { data: `Error: ${e.message}${hint}\n`, type: 'stderr' });
        socket.emit('terminal:exit', { code: 1 });
      });

      // Kill after 30s
      const killer = setTimeout(() => {
        if (_activeProc) { try { _activeProc.kill(); } catch(_) {} _activeProc = null; }
        socket.emit('terminal:output', { data: '\n[Killed: 30s timeout]\n', type: 'system' });
      }, 30000);
      proc.on('close', () => clearTimeout(killer));
    });

    // Stdin from frontend
    socket.on('terminal:input', ({ data }) => {
      if (_activeProc && _activeProc.stdin && !_activeProc.stdin.destroyed) {
        try { _activeProc.stdin.write(data); } catch(_) {}
      }
    });

    // Ctrl+C / kill from frontend
    socket.on('terminal:kill', () => {
      if (_activeProc) {
        try { _activeProc.kill('SIGTERM'); } catch(_) {}
        _activeProc = null;
        socket.emit('terminal:output', { data: '\n^C\n', type: 'system' });
        socket.emit('terminal:exit', { code: 130 });
      }
    });

    /* ── Helpers ────────────────────────────────────────── */
    function _leaveRoom(roomId) {
      socket.leave(roomId);
      const session = roomSessions.get(roomId);
      if (session) {
        const user = session.get(socket.id);
        session.delete(socket.id);
        if (session.size === 0) roomSessions.delete(roomId);
        if (user) {
          socket.to(roomId).emit('user-left', user);
          io.to(roomId).emit('room-members', _memberList(roomId));
          if (user.userId && user.userId !== socket.id)
            rooms.removeMember(roomId, user.userId);
        }
      }
      if (currentRoomId === roomId) currentRoomId = null;
    }

    function _leaveVoice(roomId) {
      const vRoom = voiceRooms.get(roomId);
      if (!vRoom) return;
      const entry = vRoom.get(socket.id);
      vRoom.delete(socket.id);
      if (vRoom.size === 0) voiceRooms.delete(roomId);
      if (entry) {
        socket.to(roomId).emit('voice:user-left', {
          socketId: socket.id,
          userId:   entry.userId,
          name:     entry.name,
        });
      }
    }
  });

  function _memberList(roomId) {
    const session = roomSessions.get(roomId);
    if (!session) return [];
    return Array.from(session.values());
  }
};
