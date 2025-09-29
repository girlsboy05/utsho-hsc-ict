const crypto = require('crypto');

// In-memory OTP store: { mobile: { code, expiresAt } }
const store = new Map();

function generateCode() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

function setOtp(mobile, ttlMinutes=5) {
  const code = generateCode();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  store.set(mobile, { code, expiresAt });
  return { code, expiresAt };
}

function verifyOtp(mobile, code) {
  const entry = store.get(mobile);
  if (!entry) return { ok:false, reason:'no_otp' };
  if (Date.now() > entry.expiresAt) {
    store.delete(mobile);
    return { ok:false, reason:'expired' };
  }
  if (entry.code !== code) {
    return { ok:false, reason:'mismatch' };
  }
  store.delete(mobile);
  return { ok:true };
}

module.exports = { setOtp, verifyOtp };
