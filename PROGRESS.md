# రేవతి రమతి కథలు — Project Progress

A Telugu story publishing platform built for Revati Ramati (pen name), to post and share her Telugu stories chapter by chapter.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite via sql.js (single `data/stories.db` file) |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Font | Google Fonts — Noto Sans Telugu |
| Auth | JWT (separate tokens for admin and users) |
| Hosting (planned) | AWS EC2 t3.micro or Lightsail |

---

## Features Completed

### Core Platform
- [x] Express server with static file serving
- [x] SQLite database (stories, chapters, admin, users, likes, comments tables)
- [x] `.env` config for secrets and admin credentials
- [x] `scripts/setup-admin.js` — creates admin account on first run

### Public Site
- [x] **Home page** (`/`) — lists all stories as cards with chapter count
- [x] **Story page** (`/story.html?id=X`) — lists all chapters for a story
- [x] **Chapter page** (`/chapter.html?story=X&ch=Y`) — full reading view with prev/next navigation
- [x] Telugu font (Noto Sans Telugu) with proper line-height for readability
- [x] Warm maroon + gold design, background image with cream overlay
- [x] Mobile responsive layout
- [x] **Copy protection** — right-click disabled, Ctrl+C/A/U/S blocked, CSS user-select: none

### Author (Admin Panel)
- [x] `/admin/login.html` — password-protected login
- [x] `/admin/dashboard.html` — view/delete all stories
- [x] `/admin/story-form.html` — create and edit stories
- [x] `/admin/chapters.html` — manage chapters per story, add new ones inline

### User Accounts
- [x] `/register.html` — create account (name, email, password)
- [x] `/login.html` — user login with redirect-back support
- [x] JWT auth stored in localStorage
- [x] Header shows logged-in user's name with logout button
- [x] **Chapter gating** — Chapters 3+ require login to read; shows bilingual prompt

### Reader Experience
- [x] **Reading progress bar** — thin gradient bar at top of page fills as you scroll
- [x] **Font size controls** — A- / A / A+ toggle, saved to localStorage
- [x] **Night/dark mode** — toggle saved to localStorage, warm dark theme
- [x] **Bookmark** — auto-saves current chapter per story; story page shows "Continue from Chapter X" button
- [x] **Reading time estimate** — "~8 నిమిషాల పఠనం (~8 min read)" shown in chapter header

### Engagement
- [x] **Like/heart button** — 🤍 toggles to ❤️, shows count, requires login
- [x] **Comments** — logged-in users can post; shows author name + time ago
- [x] **Delete own comment** — ✕ button visible on your own comments
- [x] **"New" badge** — orange badge on chapters posted within the last 48 hours

### Auto-Publish Scheduler
- [x] `scripts/schedule-publish.js` — schedule a `.txt` file to publish at a given ET time
- [x] Calls the running server's API (not the DB directly) so changes appear instantly
- [x] Usage: `node scripts/schedule-publish.js data/ch.txt "Story Title" 4 22:45`

### Content
- [x] **మహర్షి** — 4 chapters imported and live
  - Ch 1: Original file (`maharshi.txt`) — full first chapter
  - Ch 2–3: Previously imported
  - Ch 4: Created and auto-published via scheduler as a live demo

---

## API Routes

### Public
| Method | Route | Description |
|---|---|---|
| GET | `/api/stories` | List all stories |
| GET | `/api/stories/:id/chapters` | List chapters for a story |
| GET | `/api/stories/:id/chapters/:num` | Get single chapter (with prev/next) |
| GET | `/api/engage/chapters/:id/likes` | Get like count + liked status |
| GET | `/api/engage/chapters/:id/comments` | Get all comments |

### User Auth Required
| Method | Route | Description |
|---|---|---|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | User login |
| GET | `/api/users/me` | Get current user |
| POST | `/api/engage/chapters/:id/like` | Toggle like |
| POST | `/api/engage/chapters/:id/comments` | Post a comment |
| DELETE | `/api/engage/comments/:id` | Delete own comment |

### Admin Auth Required
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/stories` | Create story |
| PUT | `/api/stories/:id` | Edit story |
| DELETE | `/api/stories/:id` | Delete story |
| POST | `/api/stories/:id/chapters` | Add chapter |
| PUT | `/api/chapters/:id` | Edit chapter |
| DELETE | `/api/chapters/:id` | Delete chapter |

---

## File Structure

```
rohini_website/
├── server.js                  # Express app entry point
├── package.json
├── .env                       # Secrets (not committed)
├── .env.example
├── .gitignore
├── image.png                  # Background image
├── DEPLOY.md                  # AWS deployment guide
├── PROGRESS.md                # This file
│
├── src/
│   ├── database.js            # sql.js wrapper + table init
│   ├── middleware/
│   │   └── auth.js            # JWT middleware (admin)
│   └── routes/
│       ├── auth.js            # Admin login
│       ├── users.js           # User register/login/me
│       ├── stories.js         # Story CRUD
│       ├── chapters.js        # Chapter CRUD
│       └── engagement.js      # Likes + comments
│
├── public/
│   ├── index.html             # Home — story list
│   ├── story.html             # Story — chapter list
│   ├── chapter.html           # Reading view
│   ├── login.html             # User login
│   ├── register.html          # User registration
│   ├── image.png              # Background (served statically)
│   ├── css/
│   │   ├── style.css          # Main styles + dark mode + engagement
│   │   └── admin.css          # Admin panel styles
│   ├── js/
│   │   └── user-auth.js       # Shared header auth state
│   └── admin/
│       ├── login.html
│       ├── dashboard.html
│       ├── story-form.html
│       └── chapters.html
│
├── scripts/
│   ├── setup-admin.js         # Create/update admin account
│   ├── import-txt.js          # Manually import a .txt file as a chapter
│   └── schedule-publish.js    # Schedule a chapter to publish at a given ET time
│
└── data/
    ├── stories.db             # SQLite database (not committed)
    ├── maharshi.txt           # Ch 1 source
    ├── maharshi_ch2.txt       # Ch 2 source
    ├── maharshi_ch3.txt       # Ch 3 source
    └── maharshi_ch4.txt       # Ch 4 source (auto-published via scheduler)
```

---

## Pending / Next Up

### Author Tools
- [ ] Draft mode — save chapter without publishing, publish when ready
- [ ] Rich text editor in admin (bold, italic, paragraph breaks)
- [ ] Chapter view count tracker

### Discovery
- [ ] OG meta tags — WhatsApp/social link preview cards
- [ ] Search across stories and chapters
- [ ] Floating table of contents on chapter page

### Platform
- [ ] Email or browser notifications when a new chapter drops
- [ ] AWS deployment (EC2 or Lightsail) — get it live on the internet
- [ ] Custom domain (e.g. revatiramati.com)

---

## Running Locally

```bash
cd rohini_website
node server.js
# → http://localhost:3000

# Admin panel
# → http://localhost:3000/admin/login.html
# Username: admin  (set in .env → ADMIN_USERNAME)
# Password: changeme123  (set in .env → ADMIN_PASSWORD)

# Schedule a chapter
node scripts/schedule-publish.js data/maharshi_ch5.txt "మహర్షి" 5 22:45
```

---

## GitHub

Repository: [Nikhil9490/Vibe_coded_platform_for_my_mother-learning-outcome-Deployment-](https://github.com/Nikhil9490/Vibe_coded_platform_for_my_mother-learning-outcome-Deployment-)

Last pushed: engagement features (likes, comments, New badge)
