# ProdSmart Backend (Flask)

## Setup & Run

1. **Install dependencies:**
   ```bash
   pip install flask flask-cors
   ```

2. **Run the server:**
   ```bash
   python backend/app.py
   ```
   - Default port: 5000
   - Set `PORT` or `FLASK_DEBUG=0` as env vars to change port or disable debug.

3. **CORS:**
   - CORS is enabled for all origins with credentials (cookies/session).

## API Endpoints

- **Auth:**
  - `POST /api/auth/signup` {email, password, name}
  - `POST /api/auth/login` {email, password}
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
- **Tasks:** `GET/POST/PUT/DELETE /api/tasks`, `/api/tasks/<id>`
- **Reminders:** `GET/POST/PUT/DELETE /api/reminders`, `/api/reminders/<id>`
- **Notes:** `GET/POST/PUT/DELETE /api/notes`, `/api/notes/<id>`
- **Schedules:** `GET/POST/PUT/DELETE /api/schedules`, `/api/schedules/<id>`
- **Notifications:** `GET/POST/DELETE /api/notifications`, `/api/notifications/<id>`

All endpoints require authentication (except signup/login/session).

## MongoDB Migration

- All data is stored in in-memory Python dicts/lists for now.
- To migrate:
  - Replace the `db` dict and CRUD logic with `pymongo` queries.
  - Each resource's CRUD is modularized for easy replacement.
  - Example: `db['tasks'][user_id]` → `tasks.find({'user_id': user_id})`

## Frontend Integration

- All JS modules use `fetch` with `credentials: 'include'` for session auth.
- Data format matches the original localStorage structure.
- All business logic and validation is now server-side.

## Notes
- Passwords are stored in plaintext for demo only. Use hashing in production.
- For production, set a strong `SECRET_KEY` and use HTTPS. 