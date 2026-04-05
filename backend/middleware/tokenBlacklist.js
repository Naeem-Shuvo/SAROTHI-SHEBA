const blacklistedTokens = new Map();

function blacklistToken(token, exp) {
    if (!token) {
        return;
    }
    This line calculates the token's expiration time in **milliseconds**. It's a one-line `if-else` statement (a ternary operator).

// **`typeof exp === 'number'`**: It checks if the [exp](http://_vscodecontentref_/0) value (the token's expiration time) was successfully passed to the function.
// *   **If [exp](http://_vscodecontentref_/1) is a number**: It calculates [exp * 1000](http://_vscodecontentref_/2). JWT expiration times are in seconds, but JavaScript's `Date.now()` uses milliseconds, so this converts it to the correct unit.
// *   **If [exp](http://_vscodecontentref_/3) is NOT a number** (meaning it wasn't passed correctly): It creates a fallback expiration time of **one hour from now**. This ensures the blacklisted token will eventually be cleaned up even if its original expiration time was lost.
    const expiresAtMs = typeof exp === 'number' ? exp * 1000 : Date.now() + (60 * 60 * 1000);
    blacklistedTokens.set(token, expiresAtMs); //key,value
}

function isTokenBlacklisted(token) {
    if (!token) {
        return false;
    }

    const expiresAtMs = blacklistedTokens.get(token);
    if (!expiresAtMs) {
        return false; //still logged in,not blacklisted
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