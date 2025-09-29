const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'models', 'users.json');

function loadUsers(){
  try { return JSON.parse(fs.readFileSync(usersPath,'utf8')); } catch(e){ return []; }
}
function saveUsers(users){
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function nextRoll(){
  const users = loadUsers();
  const rolls = users.map(u=>u.roll).filter(Boolean);
  let max = 0;
  for (const r of rolls){
    const m = /^ICT(\d{3})$/.exec(r || '');
    if (m){ max = Math.max(max, parseInt(m[1],10)); }
  }
  const num = max + 1;
  return 'ICT' + String(num).padStart(3,'0');
}

module.exports = { nextRoll, loadUsers, saveUsers, usersPath };
