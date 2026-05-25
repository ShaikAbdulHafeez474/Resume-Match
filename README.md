# RésuMatch — AI-Powered Job Finder

An AI tool that reads your resume, scrapes jobs from 7 platforms, and ranks them by fit score.

## How It Works

1. Upload your resume (PDF)
2. Gemini AI analyzes your skills, experience, and target roles
3. Apify scrapes LinkedIn, Indeed, Google Jobs, Naukri, ZipRecruiter, Glassdoor, and Wellfound
4. Gemini scores every job 0–100 against your profile
5. Results shown ranked by fit — apply, skip, or come back later

## Getting API Keys

### Gemini API Key (Free)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click "Get API Key"
3. Create or select a project

### Apify API Token ($5 free monthly credit)
1. Sign up at [apify.com](https://apify.com)
2. Go to Settings → Integrations → API Token

### Neon PostgreSQL (Free tier)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

## Setup

```bash
# 1. Clone and configure
cp .env.example .env
# Fill in your API keys in .env

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install

# 4. Start the server (in /server)
npm run dev

# 5. Start the client (in /client)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. Upload your PDF resume on the home page
2. Wait ~30–60 seconds while the AI works
3. Review your ranked job matches
4. Click **Apply** to mark jobs (opens apply link)
5. Click **Skip** to hide irrelevant ones
6. Check **Stats** for your application analytics
