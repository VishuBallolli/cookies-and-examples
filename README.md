# Cookie Sections Demo

A small Node.js application showing login, logout, cookies, and protected sections without a framework or external dependencies.

## Run it

Requires Node.js 18 or newer.

```bash
npm start
```

Open <http://localhost:3000>.

Use the demo account:

- Username: `demo`
- Password: `cookies123`

## What it demonstrates

- `HttpOnly`, `SameSite=Lax`, and expiring cookies
- An opaque session cookie instead of storing user data in the browser
- Login and logout API endpoints
- Public and authenticated sections in one page
- Server-side protection for `/api/private-data`

Sessions are stored in memory for learning purposes, so restarting the server signs everyone out. Use a database or a shared session store for production.