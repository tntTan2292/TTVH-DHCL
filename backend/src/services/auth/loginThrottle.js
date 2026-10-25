'use strict';

// RBAC-01: brute-force protection that cannot be turned into a denial of service against one account.
//  - per (username, IP): 5 wrong secrets lock only that pair for 15 minutes, so a person who keeps typing
//    the admin's name wrong from their own computer blocks themselves, not the admin on another computer;
//  - per account (any IP): 25 wrong secrets within 15 minutes lock the whole account for 15 minutes
//    (distributed guessing backstop, the caller writes the lock to qis_user.locked_until).
// State is in memory: a backend restart forgets it (acceptable; the account lock is stored in the database).

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const PAIR_MAX = 5;
const ACCOUNT_MAX = 25;
const MAX_KEYS = 20000;

const pairs = new Map(); // key -> { times: number[], lockedUntil: number }
const accounts = new Map(); // username -> number[]

const normUser = (username) => String(username || '').trim().toLowerCase();
const normIp = (ip) => String(ip || 'unknown');
const pairKey = (username, ip) => `${normUser(username)}|${normIp(ip)}`;

function recent(times, nowMs) {
    return times.filter((t) => t > nowMs - WINDOW_MS);
}

function capSize(map) {
    while (map.size > MAX_KEYS) map.delete(map.keys().next().value);
}

function isPairLocked(username, ip, nowMs = Date.now()) {
    const entry = pairs.get(pairKey(username, ip));
    return Boolean(entry && entry.lockedUntil > nowMs);
}

/** Records one wrong secret. Returns { pairLocked, accountLocked } (accountLocked: this failure crossed the account threshold). */
function recordFailure(username, ip, nowMs = Date.now()) {
    const key = pairKey(username, ip);
    const entry = pairs.get(key) || { times: [], lockedUntil: 0 };
    entry.times = recent(entry.times, nowMs);
    entry.times.push(nowMs);
    let pairLocked = false;
    if (entry.times.length >= PAIR_MAX) {
        entry.lockedUntil = nowMs + LOCK_MS;
        entry.times = [];
        pairLocked = true;
    }
    pairs.set(key, entry);
    capSize(pairs);

    const user = normUser(username);
    const times = recent(accounts.get(user) || [], nowMs);
    times.push(nowMs);
    let accountLocked = false;
    if (times.length >= ACCOUNT_MAX) {
        accountLocked = true;
        accounts.delete(user);
    } else {
        accounts.set(user, times);
    }
    capSize(accounts);
    return { pairLocked, accountLocked };
}

function clearPair(username, ip) {
    pairs.delete(pairKey(username, ip));
}

/** Admin unlock or password reset: forget everything about this username, from every IP. */
function clearUser(username) {
    const user = normUser(username);
    for (const key of [...pairs.keys()]) if (key.startsWith(`${user}|`)) pairs.delete(key);
    accounts.delete(user);
}

function reset() {
    pairs.clear();
    accounts.clear();
}

module.exports = { WINDOW_MS, LOCK_MS, PAIR_MAX, ACCOUNT_MAX, isPairLocked, recordFailure, clearPair, clearUser, reset };
