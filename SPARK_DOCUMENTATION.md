# Spark - Dating App

## About

Spark is a dating app built to create meaningful connections through intentional features. Unlike traditional dating apps, Spark focuses on quality over quantity with innovative systems that encourage genuine interaction, punish ghosting, and reward authentic engagement.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native + Expo SDK 55 (TypeScript) |
| **Navigation** | Expo Router (file-based) |
| **State** | Zustand 5.0 |
| **API Client** | Axios with JWT interceptors + auto refresh |
| **Backend API** | Node.js + Express (TypeScript) |
| **Database** | PostgreSQL (Render) |
| **ORM** | Prisma |
| **Real-time** | Socket.io |
| **Auth** | JWT (access + refresh tokens) |
| **AI** | OpenAI GPT-4o-mini (date planner, ice breakers, selfie verification) |
| **Payments** | Stripe (checkout sessions + webhooks) |
| **Push Notifications** | Expo Push API |
| **Maps** | react-native-maps (mobile) + Leaflet (web) |
| **GIFs** | Giphy API |
| **Photo Upload** | Cloudinary |
| **Dark Mode** | Zustand theme store + dynamic colors |
| **i18n** | Custom translation system (PT/EN) with Zustand store |
| **Hosting** | Render (backend + DB) + EAS (mobile builds + OTA updates) |

---

## Features

### Core Features

#### 1. Anti-Ghosting System
- When two users match, a **48-hour timer** starts
- The timer resets every time the other person replies
- If someone doesn't respond within 48h, the match **expires**
- The person who ghosted **loses reputation points** (-5)
- Quick replies (within 1 hour) **earn bonus reputation** (+1)

#### 2. Energy System (25 swipes/day)
- Each user gets **25 swipes per day**
- Every swipe (like or pass) consumes 1 energy
- Energy resets on a **rolling 24-hour timer** (starts from your first swipe of the day)
- Premium users get **unlimited swipes** (energy is not consumed)
- Forces intentional swiping for free users
- Users are notified via Socket.io when energy refills

#### 3. Dynamic Compatibility Score
- Visible as a **percentage** to both users in a match
- Recalculates every **5 messages**, analyzing:
  - **Response time** (25%) -- faster replies = higher score (2h+ = 0)
  - **Questions asked** (20%) -- ~33% questions = perfect engagement
  - **Common interests** (20%) -- from profile interests overlap
  - **Message balance** (15%) -- 50/50 conversation split is ideal
  - **Humor** (10%) -- emoji and laughter detection (haha, lol, etc.)
  - **Message length balance** (10%) -- similar effort = better match
- Score evolves over time and can go **up or down**

#### 4. Proximity Map
- Shows a map with pins of nearby users
- Free users: **5km radius**; Premium users: **20km radius**
- Pin positions are **randomized within ~50m** of the real location for privacy
- Filtered by gender/orientation preferences
- Tap a pin to see a profile summary in a bottom sheet modal
- Like or pass directly from the map
- Real coordinates are **never exposed** to other users
- **Swipe status on pins**: gold (match), blue (liked), gray (passed), normal (not swiped)
- **Profile modal on map**: shows swipe status badge, "Open Chat" button for matches

#### 5. Reputation System
- Score from **0 to 100**, starts at **50**
- Affects discover ranking (higher reputation = appears higher)
- Events that change score:
  | Event | Points |
  |-------|--------|
  | Message sent | +0.5 |
  | Quick reply (< 1 hour) | +1.0 |
  | Match expired (you ghosted) | -5.0 |
  | Date plan completed | +3.0 |
  | Date plan declined | -1.0 |

---

### AI Features

#### 6. AI Date Planner
- Inside any active match, users can request **AI-generated date plans**
- Powered by **GPT-4o-mini**
- **Location-aware**: uses both users' GPS coordinates to calculate the **midpoint** between them
- Generates **3 different options** (casual, adventurous, romantic) with:
  - An activity name
  - A specific venue name near the midpoint
  - A venue address/neighborhood roughly **halfway between both users**
  - A personalized reasoning explaining why this date fits both
  - A suggested time based on availability overlap
- Frontend shows **Option 1 / Option 2 / Option 3** tabs to browse choices
- Both users submit availability windows before generating plans
- Both users must **accept** a specific option for the date to be confirmed
- Supports travel mode coordinates (uses virtual location if active)

#### 7. AI Ice Breakers
- For any match, users can request **3 AI-generated conversation starters**
- Generated from **mutual interests** between the two users
- Powered by GPT-4o-mini
- Accessible via the match detail screen

#### 8. Selfie Verification
- Users submit a selfie photo URL
- **GPT-4o vision** compares the selfie against up to 2 profile photos
- Returns a confidence level (high, medium, low) and a reason
- If confidence is high or medium, the user is marked as **verified** (blue checkmark)

---

### Social Features

#### 9. Super Like
- A special swipe that notifies the other user immediately
- **Free users**: 1 super like (lifetime)
- **Premium users**: 5 super likes per day (resets at midnight)
- **Gold users**: Unlimited super likes
- Super liked profiles show a **blue border + banner** on the other person's discover card
- Super likers are **prioritized in discover** (shown first)

#### 10. Block & Report
- **Block**: instantly blocks a user, auto-unmatches if matched, excludes them from discover and map
- **Report**: submit a report with a reason selection and optional details; status tracked as pending
- Unblock is also supported

#### 11. Unmatch
- Available from the chat action menu
- Permanently removes the match and conversation

#### 12. GIFs in Chat
- **Giphy integration** with search and trending GIFs
- Users can search for GIFs or browse trending ones
- GIFs are sent as messages in the chat

#### 13. Typing Indicator
- Animated dots shown when the other user is typing
- **Debounced every 2 seconds** to avoid excessive socket events

#### 14. Read Receipts
- **Single tick**: message delivered
- **Double tick (blue)**: message read by recipient
- Messages are marked as read via the `PUT /:matchId/messages/read` endpoint

#### 15. Shareable Profile
- Users can generate a **public share link**
- Link leads to a **public HTML page** with the user's name, age, bio, photos, interests, and verified badge
- Sharing via the **native Share API** (works on both iOS and Android)
- Public page includes App Store / Google Play download buttons

---

### Premium Features -- Spark Premium (9.99/mo)

#### 16. Unlimited Swipes
- Energy system is bypassed; no daily swipe limit

#### 17. See Who Liked You
- Unblurred photos and names in the Likes tab
- Free users see blurred previews only

#### 18. 5 Super Likes per Day
- Daily reset at midnight
- Free users only get 1 lifetime super like

#### 19. Extended Map Range
- **20km radius** instead of **5km** for free users

#### 20. Rewind
- Undo the last swipe within **5 minutes**
- Only one rewind at a time (last swipe only)

#### 21. Boost
- Appear at the **top of discover** for other users for **30 minutes**
- Activated from the profile/settings screen

---

### Premium Gold Features -- Spark Gold (24.99/mo)

Includes everything in Spark Premium, plus:

#### 22. Travel Mode
- Swipe in **8 cities** without being there physically:
  - Lisbon, Porto, London, Paris, New York, Barcelona, Tokyo, Sao Paulo
- Temporarily overrides your location for discover and map
- Can be enabled/disabled at any time

#### 23. Priority in Discover
- Gold users **always appear boosted** in the discover feed, without needing to activate a Boost

#### 24. Unlimited Super Likes
- No daily limit on super likes

#### 25. Gold Crown Badge
- Trophy icon displayed on the profile

---

### UX Features

#### 26. Dark Mode
- **Light / Dark / System** toggle in settings
- Persisted via Zustand theme store
- All screens and components use dynamic colors

#### 27. Editable Profile
- Edit **bio** (max 300 characters)
- Edit **interests** (min 3, max 15) via an interest picker modal grouped by category
- Edit **photos**: reorder via up/down arrows, add new photos, delete existing (max 6 photos)
- Edit **preferences**: looking for (multi-select Male/Female/Other), age range (min/max), max distance (km)

#### 28. Pull to Refresh
- On the **discover screen** to reload candidate profiles

#### 29. Discover Filters
- **Age range** filter (min/max)
- **Distance** filter (max km)

#### 30. Notification Badges
- **Unread message count** badge on the Chat tab
- **Likes count** badge on the Likes tab

#### 31. Profile & Settings Tabs
- **Profile tab**: reputation score, energy bar, interests, photos, bio
- **Settings tab**: theme toggle, language toggle, editable preferences, verification, premium subscription, boost, travel mode, share profile, logout, delete account

#### 31b. Multi-Language Support (PT/EN)
- Toggle between **English** (🇬🇧) and **Português** (🇵🇹) in settings
- Persisted via Zustand language store
- Translations cover: tab names, discover screen, likes, chat, profile/settings, auth screens, and general UI
- Hook `useTranslation()` provides `t(key)` function for all components

#### 32. Push Notifications
- Real **Expo Push API** notifications when app is in background
- Notification events:
  | Event | Title | Body |
  |-------|-------|------|
  | New message | "New message" | Preview of the message text |
  | Someone liked you | "Someone likes you!" | "Open Spark to see who it could be" |
  | New match | "It's a Spark!" | "You have a new match! Start chatting now." |
  | Match expiring | "Match expiring soon!" | "Don't let this spark die -- reply before time runs out!" |
  | Match expired | "Match expired" | "A match expired because no one replied in time." |
  | Energy refilled | "Energy refilled!" | "You have 25 new swipes. Go find your spark!" |

#### 33. Photo Upload
- Via **expo-image-picker** (camera or gallery)
- Uploaded to **Cloudinary** for hosting
- Supports multipart/form-data upload

#### 34. Chat Action Menu
- Custom modal accessible from the chat header
- Options: **View Profile**, **Unmatch**, **Block**, **Report**

---

### Discover Feed Algorithm

Profiles are ordered by priority:
1. **Super likers first** -- users who super liked you appear at the top
2. **Boosted users** -- users with an active boost
3. **Regular likers intercalated** -- users who liked you are mixed in every 5 swipes
4. **Outside map range** -- users beyond your distance filter
5. **Inside map range** -- users within your distance filter
6. **By reputation** -- higher reputation score = higher ranking

Blocked users and already-swiped users are excluded.

---

### Payment

#### 38. Stripe Integration
- **Checkout sessions** created via `POST /api/payments/checkout` with tier selection
- **Webhooks** at `POST /api/payments/webhook` handle subscription lifecycle events
- Success and cancel redirect pages for post-checkout flow
- Ready but requires Stripe account configuration

#### 39. Debug Premium Endpoint
- `POST /api/users/me/premium-debug` with `{ tier: 'premium' | 'gold' }`
- Activates premium for **7 days** without Stripe
- For development and testing purposes only
- The mobile app's subscribe button currently uses this debug endpoint instead of Stripe checkout

---

## Project Structure

```
Tinder2.0/
+-- spark-api/                    # Backend
|   +-- src/
|   |   +-- index.ts              # Server entry point
|   |   +-- app.ts                # Express app setup + routes
|   |   +-- socket.ts             # Socket.io setup + events
|   |   +-- config/
|   |   |   +-- env.ts            # Environment variable validation (Zod)
|   |   |   +-- database.ts       # Prisma client instance
|   |   +-- modules/
|   |   |   +-- auth/             # Signup, login, JWT refresh
|   |   |   +-- user/             # Profile CRUD, photos, interests, location, premium, boost, travel, verification, share
|   |   |   +-- swipe/            # Discover, swipe, energy, match creation, super like, rewind
|   |   |   +-- match/            # Match list, unmatch, compatibility, ice breakers, unread count
|   |   |   +-- chat/             # Messages, read receipts, analytics, anti-ghosting
|   |   |   +-- map/              # Nearby users, coordinate randomization
|   |   |   +-- date-planner/     # AI date suggestions, availability, accept/decline
|   |   |   +-- block/            # Block/unblock users, report users
|   |   |   +-- payment/          # Stripe checkout, webhooks, success/cancel pages
|   |   |   +-- notification/     # Notification CRUD
|   |   |   +-- compatibility/    # Score calculation engine
|   |   +-- shared/
|   |   |   +-- middleware/       # Error handler, validation, auth
|   |   |   +-- utils/            # Geo helpers, scoring formulas, AI helpers
|   |   |   +-- types/            # Shared TypeScript interfaces
|   |   +-- jobs/
|   |       +-- scheduler.ts      # Cron job orchestrator
|   |       +-- matchExpiry.job.ts    # Expire 48h matches + penalize ghosters
|   |       +-- energyReset.job.ts    # Reset daily energy
|   +-- prisma/
|   |   +-- schema.prisma         # Database schema (15 models)
|   |   +-- seed.ts               # Seed 46 interests
|   +-- docker-compose.yml        # PostgreSQL + Redis
|   +-- .env                      # Environment variables (DO NOT COMMIT)
|   +-- .env.example              # Template for .env
|
+-- spark-mobile/                 # Frontend
|   +-- app/
|   |   +-- _layout.tsx           # Root layout (auth initialization)
|   |   +-- index.tsx             # Entry redirect (auth check)
|   |   +-- auth/
|   |   |   +-- login.tsx         # Login screen
|   |   |   +-- signup.tsx        # Multi-step signup (3 steps)
|   |   |   +-- onboarding.tsx    # Profile setup (photos, interests, bio)
|   |   +-- (tabs)/
|   |       +-- _layout.tsx       # Tab navigator (5 tabs)
|   |       +-- discover.tsx      # Swipe cards + energy bar + filters
|   |       +-- likes.tsx         # Received likes grid (blurred for free, clear for premium)
|   |       +-- matches.tsx       # Match list + expiry timer + score
|   |       +-- map.tsx           # Proximity map + profile sheet + swipe status pins
|   |       +-- profile.tsx       # Profile, reputation, settings, premium, boost, travel
|   |       +-- chat/
|   |           +-- [matchId].tsx # Real-time chat with GIFs, typing, read receipts, action menu
|   +-- services/
|   |   +-- api.ts                # Axios instance + token refresh
|   |   +-- auth.service.ts       # Auth API calls
|   |   +-- user.service.ts       # User/profile/premium/boost/travel/share API calls
|   |   +-- match.service.ts      # Discover, swipe, matches, super like, rewind API calls
|   |   +-- chat.service.ts       # Chat API calls
|   |   +-- map.service.ts        # Nearby users API calls
|   |   +-- date-planner.service.ts # Date plan API calls
|   |   +-- socket.ts             # Socket.io client singleton
|   +-- store/
|   |   +-- authStore.ts          # Auth state (user, login, logout, refreshUser)
|   |   +-- swipeStore.ts         # Swipe state (profiles, energy)
|   |   +-- chatStore.ts          # Chat state (matches, messages)
|   |   +-- themeStore.ts         # Theme state (light/dark/system)
|   |   +-- languageStore.ts     # Language state (en/pt)
|   +-- hooks/
|   |   +-- useColors.ts          # Dynamic color hook based on theme
|   |   +-- useTranslation.ts     # Translation hook (PT/EN)
|   +-- types/
|   |   +-- index.ts              # All TypeScript interfaces
|   +-- utils/
|   |   +-- constants.ts          # Colors, API URL, limits
|   |   +-- i18n.ts               # EN/PT translations dictionary
|   +-- app.json                  # Expo configuration
|
+-- SPARK_DOCUMENTATION.md        # This file
```

---

## Database Schema

### Models (15 total)

| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | User accounts, preferences, reputation, energy, location, premium, boost, travel, verification, push token, share token |
| `UserPhoto` | `user_photos` | Profile photos (max 6, ordered by position) |
| `Interest` | `interests` | Master list of interests with categories (46 seeded) |
| `UserInterest` | `user_interests` | Many-to-many: users <-> interests |
| `Swipe` | `swipes` | Like/pass/super-like records (unique per pair) |
| `Match` | `matches` | Active matches with expiry timer, compatibility score, per-user last message timestamps |
| `Message` | `messages` | Chat messages with read status |
| `CompatibilityMetrics` | `compatibility_metrics` | Per-match analytics (response times, questions, humor, message balance, lengths) |
| `DateAvailability` | `date_availability` | Per-user availability slots for a match (JSON time windows) |
| `DatePlan` | `date_plans` | AI-suggested date plans with per-user accept/decline and AI reasoning |
| `ReputationEvent` | `reputation_events` | Audit log of reputation score changes |
| `Notification` | `notifications` | Push notification records with read status |
| `Block` | `blocks` | Block relationships (unique per pair) |
| `Report` | `reports` | User reports with reason, details, and status |

### Key User Fields

| Field | Type | Description |
|-------|------|-------------|
| `isPremium` | Boolean | Whether premium is active |
| `premiumUntil` | DateTime? | Premium expiry date |
| `premiumTier` | String? | `'premium'` or `'gold'` |
| `reputationScore` | Float | 0-100, default 50 |
| `energyRemaining` | Int | Swipes left, default 25 |
| `energyResetAt` | DateTime? | When energy resets |
| `superLikesUsedToday` | Int | Super likes used today |
| `superLikeResetAt` | DateTime? | When super like count resets |
| `boostedUntil` | DateTime? | Boost expiry |
| `isTravelMode` | Boolean | Whether travel mode is active |
| `travelLatitude/Longitude` | Float? | Travel location coordinates |
| `travelCity` | String? | Travel city name |
| `expoPushToken` | String? | Expo push notification token |
| `shareToken` | String? | Unique token for shareable profile link |
| `isVerified` | Boolean | Selfie verification status |

### Key Relationships
```
User 1--N UserPhoto
User N--N Interest (via UserInterest)
User 1--N Swipe (as swiper and as swiped)
User N--N User (via Match, as user1 and user2)
Match 1--N Message
Match 1--1 CompatibilityMetrics
Match 1--N DatePlan
Match 1--N DateAvailability
User 1--N ReputationEvent
User 1--N Notification
User 1--N Block (as blocker and as blocked)
User 1--N Report (as reporter and as reported)
```

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/signup` | Create account (email, password, name, dob, gender, lookingFor) |
| POST | `/login` | Login, returns JWT access + refresh tokens |
| POST | `/refresh` | Refresh access token using refresh token |

### Users (`/api/users`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get own full profile (with photos, interests, premium status, energy, etc.) |
| PUT | `/me` | Update profile (bio, firstName, gender, lookingFor, ageMin, ageMax, maxDistanceKm) |
| DELETE | `/me` | Delete account permanently |
| PUT | `/me/location` | Update GPS coordinates |
| POST | `/me/photos` | Add photo (accepts URL or multipart/form-data) |
| DELETE | `/me/photos/:photoId` | Remove photo (reorders remaining) |
| PUT | `/me/photos/reorder` | Reorder photos `{ photoIds: [...] }` |
| GET | `/interests` | List all available interests (46 interests, categorized) |
| PUT | `/me/interests` | Set user interests `{ interestIds: [...] }` |
| PUT | `/me/push-token` | Register Expo push notification token |
| GET | `/me/reputation` | Get reputation score + recent event log |
| POST | `/me/verify` | Request selfie verification `{ selfieUrl }` (AI-powered) |
| POST | `/me/share-link` | Generate shareable profile link |
| POST | `/me/premium` | Activate premium (legacy, accepts durationDays) |
| POST | `/me/premium-debug` | Debug: activate premium for 7 days `{ tier: 'premium' \| 'gold' }` |
| POST | `/me/boost` | Activate 30-minute boost (premium only) |
| POST | `/me/travel` | Enable travel mode `{ latitude, longitude, city }` (Gold only) |
| DELETE | `/me/travel` | Disable travel mode |
| GET | `/:id` | View another user's public profile |

### Public Routes (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile/:token` | Get shared profile data as JSON |
| GET | `/share/:token` | Get shared profile as public HTML page |
| GET | `/api/health` | Health check |

### Discover & Swipe (`/api/swipes`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/discover` | Get candidate profiles (filtered by preferences, ordered by algorithm) |
| POST | `/` | Swipe on user `{ targetUserId, direction, isSuperLike? }` |
| GET | `/energy` | Get current energy + reset time |
| GET | `/likes` | Get received likes (people who liked you) |
| GET | `/super-like-status` | Get super like usage today + limit |
| POST | `/rewind` | Undo last swipe (premium only, within 5 minutes) |

### Matches (`/api/matches`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List active matches (with last message, compatibility score, expiry) |
| GET | `/unread-count` | Get total unread message count across all matches |
| GET | `/:matchId` | Match detail |
| DELETE | `/:matchId` | Unmatch (sets status to 'unmatched') |
| GET | `/:matchId/compatibility` | Detailed compatibility breakdown |
| GET | `/:matchId/ice-breakers` | Get 3 AI-generated conversation starters |

### Chat (`/api/matches`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/:matchId/messages` | Chat history (paginated with cursor) |
| POST | `/:matchId/messages` | Send message `{ content }` |
| PUT | `/:matchId/messages/read` | Mark messages as read (triggers read receipt) |

### Proximity Map (`/api/map`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/nearby?lat=X&lng=Y` | Users nearby (5km free, 20km premium, randomized positions) |

### Date Planner (`/api/date-plans`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/matches/:matchId/availability` | Set your availability slots for a match |
| GET | `/matches/:matchId/availability` | Get both users' availability for a match |
| POST | `/matches/:matchId/date-plan` | Generate AI date suggestion (GPT-4o-mini) |
| GET | `/matches/:matchId/date-plans` | List date plans for a match |
| PUT | `/:planId/respond` | Accept/decline a plan `{ accepted: boolean }` |

### Blocks & Reports (`/api/blocks`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/:userId` | Block a user (auto-unmatches, excluded from discover/map) |
| DELETE | `/:userId` | Unblock a user |
| POST | `/report` | Report a user `{ reportedId, reason, details? }` |

### Payments (`/api/payments`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout` | Create Stripe checkout session `{ tier: 'premium' \| 'gold' }` (auth required) |
| POST | `/webhook` | Stripe webhook handler (raw body, no auth) |
| GET | `/success` | Post-checkout success redirect page |
| GET | `/cancel` | Post-checkout cancel redirect page |

---

### WebSocket Events (Socket.io)

**Client -> Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `join_match` | matchId | Join chat room for a match |
| `leave_match` | matchId | Leave chat room |
| `typing` | matchId | User is typing (debounced every 2s) |
| `stop_typing` | matchId | User stopped typing |

**Server -> Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | { matchId, message } | New chat message received |
| `message_read` | { matchId, readBy } | Messages marked as read (read receipt) |
| `user_typing` | { matchId, userId } | Someone is typing (animated dots) |
| `new_like` | { message } | Someone liked you (anonymous) |
| `new_match` | { matchId, userId } | New match created |
| `match_expired` | { matchId } | Match expired (48h ghosting) |
| `compatibility_updated` | { matchId, score } | Compatibility score recalculated |
| `energy_refilled` | { energy } | Daily energy reset |
| `date_plan_ready` | { matchId, datePlan } | AI generated a date plan |
| `date_plan_response` | { matchId, planId, accepted } | Partner responded to date plan |

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
  0.25 x response_time_score  +    # faster = higher (2h+ = 0)
  0.20 x question_ratio_score +    # ~33% questions = perfect
  0.20 x common_interests     +    # from profile interests overlap
  0.15 x message_balance      +    # 50/50 split = ideal
  0.10 x humor_score          +    # emoji/haha detection
  0.10 x msg_length_balance        # similar effort = better
) x 100
```

Recalculated every 5 messages.

---

## App Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/auth/login` | Email + password login |
| Signup | `/auth/signup` | 3-step registration (info -> gender -> preferences) |
| Onboarding | `/auth/onboarding` | Profile setup (photos -> interests -> bio) |
| Discover | `/(tabs)/discover` | Full-card swipe with photo carousel, gradient overlay, energy bar, age/distance filters, pull to refresh |
| Likes | `/(tabs)/likes` | Received likes grid (blurred for free users, unblurred for premium) |
| Chat List | `/(tabs)/matches` | Match list with new matches row + conversations list + unread badges |
| Chat Room | `/(tabs)/chat/[matchId]` | Real-time messaging with GIFs (Giphy), typing indicators, read receipts, action menu (view profile, unmatch, block, report) |
| Map | `/(tabs)/map` | Proximity map (Leaflet on web, react-native-maps on mobile) with colored pins by swipe status and profile modal |
| Profile | `/(tabs)/profile` | Own profile with editable bio/interests/photos, reputation score, energy bar, theme toggle, premium/boost/travel controls, verification, share link, logout, delete account |

---

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Match Expiry | Every 5 minutes | Checks for matches past 48h with no reply, marks as expired, penalizes ghoster (-5 reputation) |
| Energy Reset | Every 1 minute | Resets energy to 25 for users whose 24h rolling timer has elapsed |

---

## Environment Variables

### spark-api/.env

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/spark?schema=public` |
| `JWT_SECRET` | Secret key for access tokens | Any random string (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Any random string (min 32 chars) |
| `JWT_EXPIRES_IN` | Access token expiry | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `PORT` | API server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `OPENAI_API_KEY` | OpenAI key for AI features (date planner, ice breakers, selfie verification) | `sk-...` |
| `STRIPE_SECRET_KEY` | Stripe secret key for payment processing | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_PREMIUM_PRICE_ID` | Stripe price ID for Premium tier | `price_...` |
| `STRIPE_GOLD_PRICE_ID` | Stripe price ID for Gold tier | `price_...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for photo uploads | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdef...` |
| `APP_URL` | Frontend app URL (used for share links, redirects) | `https://spark-dating.app` |
| `REDIS_URL` | Redis connection (optional) | `redis://localhost:6379` |

---

## Production Deployment (VM)

The backend runs on a dedicated VM (Proxmox) with full control over the infrastructure.

### VM Details

| | |
|---|---|
| **Host** | `192.168.59.70` |
| **OS** | Ubuntu 24.04 LTS |
| **RAM** | 4 GB |
| **Disk** | 15 GB |
| **SSH** | `ssh rcorreia@192.168.59.70` |
| **API URL** | `http://192.168.59.70/api` |
| **Health check** | `http://192.168.59.70/api/health` |

### VM Stack

| Component | Details |
|-----------|---------|
| **Node.js** | v22 |
| **PostgreSQL** | v16 (local, user: `spark_user`, db: `spark`) |
| **PM2** | Process manager (auto-restart, boot startup) |
| **Nginx** | Reverse proxy on port 80 (with WebSocket support) |

### Deploying Backend Changes

A deploy script (`deploy.sh`) syncs code to the VM, builds, and restarts in ~10 seconds:

```bash
# From the project root
bash deploy.sh
```

What it does:
1. `rsync` — copies only changed files (excludes `node_modules`, `dist`, `.env`)
2. `npm install` — installs any new dependencies
3. `npm run build` — compiles TypeScript
4. `npx prisma migrate deploy` — applies any new migrations
5. `pm2 restart spark-api` — restarts the API with zero downtime

### Manual Deploy (alternative)

```bash
ssh rcorreia@192.168.59.70
cd ~/Tinder2.0/spark-api
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart spark-api
```

### VM Management Commands

```bash
# Check API status
pm2 status

# View live logs
pm2 logs spark-api

# Restart API
pm2 restart spark-api

# Stop API
pm2 stop spark-api

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql
```

### Updating the Frontend (OTA -- no reinstall needed)

For JavaScript-only changes (UI, logic, bug fixes):

```bash
cd spark-mobile
eas update --branch preview --message "description"
# App updates automatically on next open
```

### Previous Cloud Hosting (Render — deprecated)

The app was previously hosted on Render (free tier). The VM replaced it for better performance and always-on availability.

- Render API (deprecated): `https://spark-api-yvl3.onrender.com`
- Render DB (deprecated): `spark-db` on Render PostgreSQL

---

## Local Development

### Prerequisites
- **Node.js** v18+ installed
- **PostgreSQL** installed and running locally (or via Docker)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`

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

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- JWT tokens with separate secrets for access/refresh
- Auto token refresh on 401 responses (Axios interceptor)
- Location privacy: real coordinates **never sent** to other users; map pins randomized +/-50m
- Input validation on all endpoints via **Zod schemas**
- Auth middleware protects all routes except signup/login and public profile pages
- Stripe webhook verification with signing secret
- Blocked users fully excluded from all interactions

---

## Mobile App Build (Android)

### Local Build (recommended — fast, ~3-5 min)

Requires **Android Studio** with the Android SDK installed.

**First time setup:**
```bash
cd spark-mobile

# Generate native Android project
npx expo prebuild --platform android

# Set SDK path (only needed once)
# In android/local.properties, ensure:
# sdk.dir=C\:/Users/Rodrigo/AppData/Local/Android/Sdk
```

**Build APK:**
```bash
cd spark-mobile/android
.\gradlew.bat assembleRelease
```

The APK is generated at:
```
spark-mobile/android/app/build/outputs/apk/release/app-release.apk
```

**Install on phone:**
1. **USB cable:** Connect phone → copy APK → open and install
2. **ADB:** `adb install android/app/build/outputs/apk/release/app-release.apk`
3. **Share:** Send APK via email/Drive/WhatsApp to yourself → open on phone

> First install: Allow "Install from unknown sources" when prompted.

**After code changes (JS only — no new native packages):**
```bash
cd spark-mobile/android
.\gradlew.bat assembleRelease
# Copy new APK to phone
```

Or use OTA update (no reinstall needed):
```bash
eas update --branch preview --message "description"
```

### Cloud Build (EAS — slower, ~15-20 min)

For when you can't build locally or need iOS builds.

```bash
npm install -g eas-cli
eas login

cd spark-mobile

# Preview APK
eas build --profile preview --platform android

# Production build (for Play Store)
eas build --profile production --platform android
```

### EAS Configuration

The build profiles are defined in `spark-mobile/eas.json`:

| Profile | Description | Output |
|---------|-------------|--------|
| `development` | Dev client with debugging tools | APK (internal) |
| `preview` | Testing build without dev tools | APK (internal) |
| `production` | Play Store release | AAB (auto-increment version) |

### Expo Project

- **Account:** rodrigo.correia.23
- **Project:** spark
- **Dashboard:** https://expo.dev/accounts/rodrigo.correia.23/projects/spark

### OTA Updates (Over-the-Air)

EAS Update allows pushing JavaScript changes to users **without generating a new APK**. Users receive updates automatically when they open the app.

**When to use OTA Update (no rebuild needed):**
- Changes to JS/TS files (components, screens, styles, logic)
- Bug fixes, text changes, new features in JavaScript
- Basically any code change that doesn't touch native modules

**When you need a full rebuild:**
- Adding/removing native packages (`npm install react-native-camera`)
- Changing `app.json` (permissions, plugins, package name, SDK version)
- Upgrading Expo SDK

**How to push an OTA update:**

```bash
cd spark-mobile
git add -A
git commit -m "description of changes"
eas update --branch preview --message "description of changes"
```

The app on users' phones will automatically download the update next time they open it. No new APK, no new install link.

---

## GitHub Repository

- **Repository:** https://github.com/RodrigoCorreia23/Tinder2.0
- Clone: `git clone git@github.com:RodrigoCorreia23/Tinder2.0.git`
