const blacklistedTokens = new Map();

function blacklistToken(token, exp) {
    if (!token) {
        return;
    }

    const expiresAtMs = typeof exp === 'number' ? exp * 1000 : Date.now() + (60 * 60 * 1000);
    blacklistedTokens.set(token, expiresAtMs);
}

function isTokenBlacklisted(token) {
    if (!token) {
        return false;
    }

    const expiresAtMs = blacklistedTokens.get(token);
    if (!expiresAtMs) {
        return false;
    }

    if (Date.now() >= expiresAtMs) {
        blacklistedTokens.delete(token);
        return false;
    }

    return true;
}

setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAtMs] of blacklistedTokens.entries()) {
        if (now >= expiresAtMs) {
            blacklistedTokens.delete(token);
        }
    }
}, 15 * 60 * 1000).unref();

module.exports = {
    blacklistToken,
    isTokenBlacklisted
};