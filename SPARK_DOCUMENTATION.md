# Spark - Dating App

## About

Spark is a dating app built to create meaningful connections through intentional features. Unlike traditional dating apps, Spark focuses on quality over quantity with innovative systems that encourage genuine interaction.

---

## Key Features

### 1. Anti-Ghosting System
- When two users match, a **48-hour timer** starts
- The timer resets every time the other person replies
- If someone doesn't respond within 48h, the match **expires**
- The person who ghosted **loses reputation points** (-5)
- Quick replies (within 1 hour) **earn bonus reputation** (+1)

### 2. Date Planner with AI
- Inside any active match, users can request an AI-generated date plan
- The system analyzes both users' **common interests** and suggests:
  - An activity (e.g., "Coffee date at a cozy cafe")
  - A venue name and address
  - A suggested time (next Saturday at 7 PM)
  - A reasoning explaining why this date was suggested
- Both users must **accept** for the date to be confirmed
- Currently uses rule-based matching; ready for OpenAI API integration

### 3. Energy System (25 swipes/day)
- Each user gets **25 swipes per day**
- Every swipe (like or pass) consumes 1 energy
- Energy resets on a **rolling 24-hour timer** (starts from your first swipe of the day)
- Forces intentional swiping — quality over quantity
- Users are notified via Socket.io when energy refills

### 4. Dynamic Compatibility Score
- Visible as a **percentage** to both users in a match
- Recalculates every 5 messages, analyzing:
  - **Response time** (25%) — faster replies = higher score
  - **Questions asked** (20%) — more questions = more engaged
  - **Common interests** (20%) — from profile overlap
  - **Message balance** (15%) — 50/50 conversation is ideal
  - **Humor** (10%) — emoji and laughter detection (😂, haha, lol, etc.)
  - **Message length balance** (10%) — similar effort = better match
- Score evolves over time and can go **up or down**

### 5. Proximity Map (200m radius)
- Shows a map with pins of nearby users within **200 meters**
- Pin positions are **randomized within ~50m** of the real location (privacy)
- Filtered by gender/orientation preferences
- Tap a pin to see a profile summary bottom sheet
- Like or pass directly from the map
- Real coordinates are **never exposed** to other users

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native + Expo (TypeScript) |
| **Navigation** | Expo Router (file-based) |
| **State** | Zustand (client state) |
| **API Client** | Axios with JWT interceptors |
| **Backend API** | Node.js + Express (TypeScript) |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Real-time** | Socket.io |
| **Auth** | JWT (access + refresh tokens) |
| **Cron Jobs** | node-cron |
| **Validation** | Zod |
| **Maps** | react-native-maps |
| **Location** | expo-location |
| **Secure Storage** | expo-secure-store |

---

## Project Structure

```
Tinder/
├── spark-api/                    # Backend
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── app.ts                # Express app setup + routes
│   │   ├── socket.ts             # Socket.io setup + events
│   │   ├── config/
│   │   │   ├── env.ts            # Environment variable validation (Zod)
│   │   │   └── database.ts       # Prisma client instance
│   │   ├── modules/
│   │   │   ├── auth/             # Signup, login, JWT refresh
│   │   │   ├── user/             # Profile CRUD, photos, interests, location
│   │   │   ├── swipe/            # Discover, swipe, energy, match creation
│   │   │   ├── match/            # Match list, unmatch, compatibility
│   │   │   ├── chat/             # Messages, analytics, anti-ghosting
│   │   │   ├── map/              # Nearby users, coordinate randomization
│   │   │   ├── date-planner/     # AI date suggestions, accept/decline
│   │   │   ├── notification/     # Notification CRUD
│   │   │   └── compatibility/    # Score calculation engine
│   │   ├── shared/
│   │   │   ├── middleware/       # Error handler, validation, auth
│   │   │   ├── utils/            # Geo helpers, scoring formulas
│   │   │   └── types/            # Shared TypeScript interfaces
│   │   └── jobs/
│   │       ├── scheduler.ts      # Cron job orchestrator
│   │       ├── matchExpiry.job.ts    # Expire 48h matches + penalize ghosters
│   │       └── energyReset.job.ts    # Reset daily energy
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (11 models)
│   │   └── seed.ts               # Seed 46 interests
│   ├── docker-compose.yml        # PostgreSQL + Redis
│   ├── .env                      # Environment variables (DO NOT COMMIT)
│   └── .env.example              # Template for .env
│
├── spark-mobile/                 # Frontend
│   ├── app/
│   │   ├── _layout.tsx           # Root layout (auth initialization)
│   │   ├── index.tsx             # Entry redirect (auth check)
│   │   ├── auth/
│   │   │   ├── login.tsx         # Login screen
│   │   │   ├── signup.tsx        # Multi-step signup (3 steps)
│   │   │   └── onboarding.tsx    # Profile setup (photos, interests, bio)
│   │   └── (tabs)/
│   │       ├── _layout.tsx       # Tab navigator (4 tabs)
│   │       ├── discover.tsx      # Swipe cards + energy bar
│   │       ├── matches.tsx       # Match list + expiry timer + score
│   │       ├── map.tsx           # Proximity map + profile sheet
│   │       ├── profile.tsx       # Own profile, reputation, settings
│   │       └── chat/
│   │           └── [matchId].tsx # Real-time chat screen
│   ├── services/
│   │   ├── api.ts                # Axios instance + token refresh
│   │   ├── auth.service.ts       # Auth API calls
│   │   ├── user.service.ts       # User/profile API calls
│   │   ├── match.service.ts      # Discover, swipe, matches API calls
│   │   ├── chat.service.ts       # Chat API calls
│   │   ├── map.service.ts        # Nearby users API calls
│   │   ├── date-planner.service.ts # Date plan API calls
│   │   └── socket.ts             # Socket.io client singleton
│   ├── store/
│   │   ├── authStore.ts          # Auth state (user, login, logout)
│   │   ├── swipeStore.ts         # Swipe state (profiles, energy)
│   │   └── chatStore.ts          # Chat state (matches, messages)
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces
│   ├── utils/
│   │   └── constants.ts          # Colors, API URL, limits
│   └── app.json                  # Expo configuration
│
└── SPARK_DOCUMENTATION.md        # This file
```

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts, preferences, reputation, energy, location |
| `user_photos` | Profile photos (max 6, ordered by position) |
| `interests` | Master list of interests with categories |
| `user_interests` | Many-to-many: users ↔ interests |
| `swipes` | Like/pass records (unique per pair) |
| `matches` | Active matches with expiry timer + compatibility score |
| `messages` | Chat messages |
| `compatibility_metrics` | Per-match analytics (response times, questions, humor) |
| `date_plans` | AI-suggested date plans with accept/decline |
| `reputation_events` | Audit log of reputation score changes |
| `notifications` | Push notification records |

### Key Relationships
```
users 1──N user_photos
users N──N interests (via user_interests)
users 1──N swipes (as swiper)
users N──N users (via matches)
matches 1──N messages
matches 1──1 compatibility_metrics
matches 1──N date_plans
users 1──N reputation_events
users 1──N notifications
```

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/signup` | Create account (email, password, name, dob, gender, lookingFor) |
| POST | `/login` | Login, returns JWT tokens |
| POST | `/refresh` | Refresh access token |

### Users (`/api/users`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get own full profile |
| PUT | `/me` | Update profile (bio, preferences) |
| PUT | `/me/location` | Update GPS coordinates |
| POST | `/me/photos` | Add photo |
| DELETE | `/me/photos/:photoId` | Remove photo |
| PUT | `/me/photos/reorder` | Reorder photos |
| GET | `/interests` | List all available interests |
| PUT | `/me/interests` | Set user interests |
| PUT | `/me/push-token` | Register push notification token |
| GET | `/me/reputation` | Get reputation score + event log |
| GET | `/:id` | View another user's public profile |

### Discover & Swipe (`/api/swipes`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/discover` | Get candidate profiles (filtered by preferences) |
| POST | `/` | Swipe on user `{ targetUserId, direction }` |
| GET | `/energy` | Get current energy + reset time |

### Matches (`/api/matches`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List active matches (with last message, score, expiry) |
| GET | `/:matchId` | Match detail |
| DELETE | `/:matchId` | Unmatch |
| GET | `/:matchId/compatibility` | Detailed compatibility breakdown |
| GET | `/:matchId/messages` | Chat history (paginated with cursor) |
| POST | `/:matchId/messages` | Send message |
| PUT | `/:matchId/messages/read` | Mark messages as read |

### Proximity Map (`/api/map`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/nearby?lat=X&lng=Y` | Users within 200m (randomized positions) |

### Date Planner (`/api/date-plans`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/matches/:matchId/date-plan` | Generate AI date suggestion |
| GET | `/matches/:matchId/date-plans` | List date plans for match |
| PUT | `/:planId/respond` | Accept/decline `{ accepted: boolean }` |

### WebSocket Events (Socket.io)

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `join_match` | matchId | Join chat room |
| `leave_match` | matchId | Leave chat room |
| `typing` | matchId | User is typing |
| `stop_typing` | matchId | User stopped typing |

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | { matchId, message } | New chat message |
| `message_read` | { matchId, readBy } | Messages marked as read |
| `user_typing` | { matchId, userId } | Someone is typing |
| `new_match` | { matchId, userId } | New match created |
| `match_expired` | { matchId } | Match expired (48h ghosting) |
| `compatibility_updated` | { matchId, score } | Score recalculated |
| `energy_refilled` | { energy } | Daily energy reset |
| `date_plan_ready` | { matchId, datePlan } | AI generated a plan |
| `date_plan_response` | { matchId, planId, accepted } | Partner responded |

---

## How to Run

### Prerequisites
- **Node.js** v18+ installed
- **PostgreSQL** installed and running locally (or via Docker)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your phone (for mobile testing)

### 1. Database Setup

If using Docker:
```bash
cd spark-api
docker-compose up -d
```

If using local PostgreSQL, create the database:
```sql
CREATE DATABASE spark;
```

### 2. Backend Setup

```bash
cd spark-api

# Install dependencies
npm install

# Configure environment (edit .env with your credentials)
# The DATABASE_URL format is:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Run database migrations (creates all tables)
npx prisma migrate dev --name init

# Seed the interests table (46 interests)
npm run db:seed

# Start the development server
npm run dev
```

The API will be running at **http://localhost:3000**.

Test it:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Frontend Setup

```bash
cd spark-mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

Then:
- **Phone**: Scan the QR code with Expo Go
- **Android emulator**: Press `a`
- **iOS simulator**: Press `i`
- **Web**: Press `w`

> **Note**: For the mobile app to connect to the API, make sure to update the `API_URL` in `spark-mobile/utils/constants.ts` if needed. On a physical device, use your computer's local IP instead of `localhost`.

### 4. Prisma Studio (Optional)

To visually browse and edit the database:
```bash
cd spark-api
npm run db:studio
```
Opens at **http://localhost:5555**.

---

## Environment Variables

### spark-api/.env

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/spark?schema=public` |
| `JWT_SECRET` | Secret key for access tokens | Any random string (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Any random string (min 32 chars) |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `PORT` | API server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `OPENAI_API_KEY` | OpenAI key (for AI date planner v2) | `sk-...` (optional for MVP) |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

---

## Scoring Algorithms

### Reputation Score (0-100, starts at 50)

| Event | Points |
|-------|--------|
| Message sent | +0.5 |
| Quick reply (< 1 hour) | +1.0 |
| Match expired (you ghosted) | -5.0 |
| Date plan completed | +3.0 |
| Date plan declined | -1.0 |

High reputation = appears higher in discover feed.

### Compatibility Score Formula

```
score = (
  0.25 × response_time_score  +    # faster = higher (2h+ = 0)
  0.20 × question_ratio_score +    # ~33% questions = perfect
  0.20 × common_interests     +    # from profile interests overlap
  0.15 × message_balance      +    # 50/50 split = ideal
  0.10 × humor_score          +    # emoji/haha detection
  0.10 × msg_length_balance        # similar effort = better
) × 100
```

---

## App Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/auth/login` | Email + password login |
| Signup | `/auth/signup` | 3-step registration (info → gender → preferences) |
| Onboarding | `/auth/onboarding` | Profile setup (photos → interests → bio) |
| Discover | `/(tabs)/discover` | Swipe cards with energy bar and match alerts |
| Matches | `/(tabs)/matches` | Match list with timer, compatibility %, last message |
| Chat | `/(tabs)/chat/[matchId]` | Real-time messaging with typing indicators |
| Map | `/(tabs)/map` | Proximity map with user pins and profile sheet |
| Profile | `/(tabs)/profile` | Own profile, reputation, energy, preferences |

---

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Match Expiry | Every 5 minutes | Checks for matches past 48h, marks as expired, penalizes ghoster |
| Energy Reset | Every 1 minute | Resets energy to 25 for users whose 24h timer elapsed |

---

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- JWT tokens with separate secrets for access/refresh
- Auto token refresh on 401 responses
- Location privacy: real coordinates **never sent** to other users; map pins randomized ±50m
- Input validation on all endpoints via **Zod schemas**
- Auth middleware protects all routes except signup/login

---

## Future Improvements

- [ ] Photo upload to AWS S3 with presigned URLs (currently uses URLs directly)
- [ ] OpenAI integration for smarter date suggestions
- [ ] Push notifications with Expo Push Service
- [ ] Phone number verification
- [ ] Report/block user functionality
- [ ] Profile verification (selfie check)
- [ ] Advanced NLP for topic detection in compatibility scoring
- [ ] Redis caching for discover queries
- [ ] Rate limiting on API endpoints
