# RecallHub 🧠✨

> **A modern, personal knowledge capture, active spaced-recall, and mastery-tracking application.**

RecallHub bridges the gap between note-taking and long-term retention. Instead of letting notes gather digital dust, RecallHub transforms your notes into active recall questions, schedules them with an SM-2-inspired spaced repetition engine, tracks dynamic mastery levels (0–5), and sends proactive reminders via Web Push notifications.

---

## 🌟 Key Features

### 📚 Hierarchical Knowledge Organization
- **Categories & Topics**: Structure your learning into deep, organized trees.
- **Rich Knowledge Items**: Capture rich notes with tags, markdown formatting, formulas, callouts, and checklists.
- **Fast Global Search & Filter**: Instantly search across categories, topics, knowledge items, and tags.

### 🎨 Visual Canvas & Rich Note-Taking
- **Integrated Drawing Canvas**: Draw diagrams, annotate with pens, highlighters, arrows, and geometric shapes right on your notes.
- **Vector Normalization & Responsive Scaling**: Vector drawings scale smoothly across mobile and desktop displays.
- **Image Lightbox & Attachments**: Upload and view image attachments with automatic validation and secure storage.
- **Printable Notebook View**: Export cleanly formatted note summaries ready for printing or PDF archiving.

### ⏰ SM-2 Spaced Repetition Engine
- **Pre-Reveal Confidence Calibration**: Rate your confidence *before* revealing answers to build self-awareness and calibration.
- **Self-Scoring**: Score recall outcomes (`Forgot`, `Difficult`, `Partial`, `Good`, `Easy`) with dynamic ease-factor adjustments.
- **Leech Detection**: Automatically detects items forgotten 3+ consecutive times and routes them to a dedicated queue for targeted review.
- **Segmented Review Queue**: Distinct queues for **Overdue**, **Due Today**, **Upcoming**, and **Leeches**.

### 🏆 0–5 Dynamic Mastery Tracking
- **Mastery Engine**: Continuously computes a 0 to 5 mastery rating based on recall consistency, retention history, and practice attempts.
- **Practice Mode**: Engage with dedicated practice prompts and track attempts over time.

### 📓 Learning Journal, Ideas & Experiences
- **Daily Reflections**: Capture ongoing reflections and breakthroughs in a dedicated journal.
- **Ideas & Experiences Log**: Record sudden insights and real-world experiential notes attached to your learning journey.

### 📱 Progressive Web App (PWA) & Web Push Reminders
- **Installable PWA**: Install RecallHub natively on Windows, macOS, iOS, and Android.
- **Offline Shell**: Service worker caching ensures fast loading anywhere.
- **OS-Level Web Push Reminders**: Receive automated push notification reminders when review queues are due, powered by VAPID.

### 📊 Dashboard & Retention Analytics
- **Activity & Retention Metrics**: Visualize study streaks, mastery distribution, review queues, and accuracy trends over time.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [Pydantic v2](https://docs.pydantic.dev/), [Alembic](https://alembic.sqlalchemy.org/), [pywebpush](https://github.com/web-push-libs/pywebpush), [PyJWT](https://pyjwt.readthedocs.io/) |
| **Frontend** | [React 18](https://react.dev/), [TypeScript 5.5+](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) |
| **Databases** | [PostgreSQL](https://www.postgresql.org/) (Production/Docker), [SQLite](https://www.sqlite.org/) (Zero-setup local development) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit/Integration), [Playwright](https://playwright.dev/) (E2E), [pytest](https://pytest.org/) |
| **Infrastructure** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |

---

## 🚀 Getting Started

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 20 or higher (with npm)
- **Docker:** *(Optional, for containerized deployment)*

---

### Option 1: Quickstart with SQLite (Zero Database Setup)

The fastest way to get up and running locally without installing PostgreSQL.

#### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt

# Set local environment variables (PowerShell)
$env:DATABASE_URL="sqlite:///./recallhub.db"
$env:SECRET_KEY="super-secret-local-dev-key"

# Or on macOS / Linux (bash/zsh):
# export DATABASE_URL="sqlite:///./recallhub.db"
# export SECRET_KEY="super-secret-local-dev-key"

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```
> Backend will be live at **http://localhost:8000** (Swagger API docs at **http://localhost:8000/docs**).

#### 2. Frontend Setup (in a new terminal)
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
> Frontend will be live at **http://localhost:5173**.

---

### Option 2: Local PostgreSQL Setup

#### 1. Create the Database & User
```bash
createuser recallhub -P          # Enter a password, e.g., "recallhub"
createdb recallhub -O recallhub
```

#### 2. Configure Backend & Run Migrations
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# Set database connection string
export DATABASE_URL="postgresql+psycopg2://recallhub:recallhub@localhost:5432/recallhub"
export SECRET_KEY="super-secret-local-dev-key"

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

#### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

### Option 3: Full Docker Compose Setup

Run the full stack (PostgreSQL database, FastAPI backend, and React frontend) with a single command:

```bash
# Copy the environment configuration template
cp .env.example .env

# Build and start all services
docker-compose up --build
```
- Frontend: **http://localhost:5173**
- Backend API & Docs: **http://localhost:8000/docs**
- PostgreSQL: **localhost:5432**

---

### 🧪 Optional: Seeding Sample Data

To populate sample categories, topics, knowledge items, and recall sessions for testing:

```bash
# Ensure backend is running, then in a new terminal:
cd backend
python ../scripts/seed_data.py
```
> Creates demo account: `demo@recallhub.local` / `demopassword123`.

---

## 🔔 Setting Up Web Push Notifications (VAPID)

RecallHub supports OS-level browser push notifications for due review reminders.

1. **Generate VAPID Keys**:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Add Keys to `.env` or Environment Variables**:
   ```ini
   VAPID_PUBLIC_KEY=your_generated_public_key
   VAPID_PRIVATE_KEY=your_generated_private_key
   VAPID_CLAIM_EMAIL=mailto:support@yourdomain.com
   ```
3. Open the **RecallHub Settings Modal** in the frontend, enable **Due Review Notifications**, and send a test notification to verify delivery.

---

## 📂 Project Structure

```
recallhub/
├── .env.example               # Environment variables template
├── .gitignore                  # Git ignore rules for Python, Node, OS, DB
├── docker-compose.yml          # Container configuration for full stack
├── docs/                       # Architecture & design documentation
│   └── architecture.md
├── scripts/                    # Automation & seeding scripts
│   ├── generate_icons.py       # PWA icon generator
│   └── seed_data.py            # Demo database seeder
├── backend/
│   ├── alembic/                # Database migrations
│   ├── alembic.ini             # Alembic configuration
│   ├── Dockerfile              # Backend container definition
│   ├── pyproject.toml          # Tooling & linter configuration
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # Development & test dependencies
│   ├── uploads/                # User uploaded images & media
│   └── app/
│       ├── api/v1/             # Resource endpoints (auth, knowledge, recall, push...)
│       ├── core/               # Configuration, security, JWT, exceptions
│       ├── db/                 # Database session & base declarative models
│       ├── models/             # SQLAlchemy ORM entity models
│       ├── schemas/            # Pydantic request/response schemas
│       ├── services/           # Spaced repetition, mastery, and push engines
│       └── utils/              # Helper utilities
└── frontend/
    ├── public/                 # PWA manifest, service worker (sw.js), icons
    ├── src/
    │   ├── api/                # Axios API client functions
    │   ├── auth/               # Authentication context & route guards
    │   ├── components/         # Reusable UI, layout, canvas & notes components
    │   ├── context/            # Global React contexts
    │   ├── hooks/              # Custom React hooks
    │   ├── pages/              # Application views (Dashboard, Knowledge, Recall, etc.)
    │   ├── types/              # TypeScript type definitions
    │   └── utils/              # Canvas normalization, SVG drawing, PWA push helpers
    ├── package.json            # Frontend dependencies & npm scripts
    ├── tailwind.config.js      # Tailwind CSS configuration
    ├── tsconfig.json           # TypeScript configuration
    └── vite.config.ts          # Vite build configuration
```

---

## 🔄 Core Spaced Repetition Workflow

```mermaid
flowchart TD
    A[Create Knowledge Item & Notes] --> B[Generate Recall Questions & Prompts]
    B --> C[Active Recall Session]
    C --> D[1. Predict Confidence: Low / Med / High]
    D --> E[2. Reveal Answer]
    E --> F[3. Self-Score: Forgot / Difficult / Partial / Good / Easy]
    F --> G[Spaced Repetition Engine: Update Interval & Ease Factor]
    G --> H{Forgot 3+ Consecutive Times?}
    H -- Yes --> I[Flag as Leech Queue]
    H -- No --> J[Schedule Next Review Date]
    G --> K[Mastery Engine: Update 0-5 Level]
    J --> L[Web Push Reminder Dispatched When Due]
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
# Run unit & component tests
npm run test

# Run end-to-end Playwright tests
npm run test:e2e
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
