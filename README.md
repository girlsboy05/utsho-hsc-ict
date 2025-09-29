# UTSLMS Node App (v1.0.0)

Quick start:
1. `cp .env.example .env` and fill values (keep `SMS_SANDBOX=true` for testing).
2. `npm install`
3. `npm start`
4. Open http://localhost:3000

Notes:
- Storage is JSON file at `src/models/users.json` (sufficient for demo).
- OTP is stored in-memory for 5 minutes.
- SMS runs in SANDBOX by default (logs to console).
- Routine is loaded from `data/routine.2025.json`.
