const fetch = require('node-fetch');

const BASE_URL = process.env.SMS_GATEWAY_BASE_URL || 'http://bulksmsbd.net/api/smsapi';
const API_KEY = process.env.SMS_GATEWAY_API_KEY || '';
const SENDER = process.env.SMS_SENDER_ID || '8809648904263';
const TYPE = process.env.SMS_TYPE || 'text';
const SANDBOX = (process.env.SMS_SANDBOX || 'true').toLowerCase() === 'true';
const WHITELIST = (process.env.SMS_WHITELIST || '').split(',').map(s=>s.trim()).filter(Boolean);

async function sendMessage({ to, message }){
  const shouldDeliver = !SANDBOX || WHITELIST.includes(to);
  const url = `${BASE_URL}?api_key=${encodeURIComponent(API_KEY)}&type=${encodeURIComponent(TYPE)}&number=${encodeURIComponent(to)}&senderid=${encodeURIComponent(SENDER)}&message=${encodeURIComponent(message)}`;
  if (!shouldDeliver || !API_KEY){
    console.log('[SMS:SANDBOX]', { to, message, url });
    return { ok:true, sandbox:true };
  }
  try{
    const res = await fetch(url, { method:'GET', timeout: 10000 });
    const text = await res.text();
    console.log('[SMS:PROVIDER]', res.status, text);
    return { ok: res.ok, status: res.status, body: text };
  }catch(err){
    console.error('[SMS:ERROR]', err);
    return { ok:false, error: String(err) };
  }
}

async function sendOtp({ to, code, ttlSeconds }){
  const ttlMin = Math.round((ttlSeconds || 300) / 60);
  const msg = `Your UTSLMS code is ${code}. Expires in ${ttlMin} minutes.`;
  return sendMessage({ to, message: msg });
}

async function sendConfirmation({ to, name, roll }){
  const msg = `Welcome ${name}! Your program roll is ${roll}.`;
  return sendMessage({ to, message: msg });
}

module.exports = { sendOtp, sendConfirmation };
