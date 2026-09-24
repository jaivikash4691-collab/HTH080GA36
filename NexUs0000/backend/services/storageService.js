import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'nexus_db.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: {},
      papers: {},
      sessions: {},
      findings: {},
      gaps: {},
      directions: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('[NEXUS Storage] Error reading DB:', err.message);
    return { users: {}, papers: {}, sessions: {}, findings: {}, gaps: {}, directions: {} };
  }
}

function writeDb(data) {
  ensureDataFile();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[NEXUS Storage] Error writing DB:', err.message);
  }
}

export const storageService = {
  // Users
  getUserByEmail(email) {
    const db = readDb();
    return db.users[email.toLowerCase().trim()] || null;
  },

  getUserById(id) {
    const db = readDb();
    for (const email in db.users) {
      if (db.users[email].id === id) {
        return db.users[email];
      }
    }
    return null;
  },

  saveUser(user) {
    const db = readDb();
    db.users[user.email.toLowerCase().trim()] = user;
    writeDb(db);
    return user;
  },

  // Papers
  getUserPapers(userId) {
    const db = readDb();
    return db.papers[userId] || [];
  },

  saveUserPaper(userId, paper) {
    const db = readDb();
    if (!db.papers[userId]) {
      db.papers[userId] = [];
    }
    const existingIdx = db.papers[userId].findIndex(p => p.id === paper.id || p.code === paper.code);
    if (existingIdx >= 0) {
      db.papers[userId][existingIdx] = paper;
    } else {
      db.papers[userId].unshift(paper);
    }
    writeDb(db);
    return db.papers[userId];
  },

  deleteUserPaper(userId, paperId) {
    const db = readDb();
    if (!db.papers[userId]) return false;
    const initialLen = db.papers[userId].length;
    db.papers[userId] = db.papers[userId].filter(p => p.id !== paperId && p.code !== paperId);
    writeDb(db);
    return db.papers[userId].length !== initialLen;
  },

  // Findings & Gaps
  getUserFindings(userId) {
    const db = readDb();
    return db.findings[userId] || [];
  },

  saveUserFindings(userId, findings) {
    const db = readDb();
    db.findings[userId] = findings;
    writeDb(db);
  },

  getUserGaps(userId) {
    const db = readDb();
    return db.gaps[userId] || [];
  },

  saveUserGaps(userId, gaps) {
    const db = readDb();
    db.gaps[userId] = gaps;
    writeDb(db);
  },

  getUserDirections(userId) {
    const db = readDb();
    return db.directions[userId] || [];
  },

  saveUserDirections(userId, directions) {
    const db = readDb();
    db.directions[userId] = directions;
    writeDb(db);
  }
};

export default storageService;
