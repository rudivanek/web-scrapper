# Complete Technical Breakdown & Rebuild Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Full Architecture](#full-architecture)
3. [Technology Stack](#technology-stack)
4. [Folder & File Structure](#folder--file-structure)
5. [Database Schema](#database-schema)
6. [API Integration](#api-integration)
7. [Component Architecture](#component-architecture)
8. [UI/UX Design System](#uiux-design-system)
9. [State Management](#state-management)
10. [Data Flow](#data-flow)
11. [Step-by-Step Rebuild Guide](#step-by-step-rebuild-guide)

---

## Project Overview

**Web-Scraper** is a professional SEO crawling and analysis tool built with React, TypeScript, and Supabase. It allows users to:

- Crawl websites using Firecrawl API
- Extract metadata (titles, descriptions, headers, images, links)
- Analyze SEO factors (indexability, canonical URLs, status codes, keywords)
- Save crawl results to a database
- Export data as CSV
- Track token usage and costs
- Run SEO intelligence modules

The app is designed for SEO professionals and web developers who need to audit websites at scale.

---

## Full Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                   │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Auth       │  │ Crawler  │  │ SEO Intel    │    │
│  │ Components │  │ Module   │  │ Modules      │    │
│  └────────────┘  └──────────┘  └──────────────┘    │
│           │              │              │            │
│           └──────────────┴──────────────┘            │
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE (Backend)                      │
│  ┌──────────────┐  ┌────────────────────────┐      │
│  │ Auth Service │  │ Postgres Database      │      │
│  │ (Built-in)   │  │ - crawls               │      │
│  └──────────────┘  │ - crawl_results        │      │
│                    │ - crawl_cache          │      │
│  ┌──────────────┐  │ - seo_analyses         │      │
│  │ Edge         │  │ - RLS Policies         │      │
│  │ Functions    │  └────────────────────────┘      │
│  │ (Proxy)      │                                   │
│  └──────────────┘                                   │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            FIRECRAWL API (External)                  │
│  - Site mapping (/v1/map)                           │
│  - Page scraping (/v1/scrape)                       │
│  - Metadata extraction                              │
└─────────────────────────────────────────────────────┘
```

### Request Flow

1. **User enters domain** → Frontend validates input
2. **Start Crawl** → Frontend calls Supabase Edge Function
3. **Edge Function** → Proxies request to Firecrawl API
4. **Firecrawl** → Maps site, returns URLs
5. **Frontend** → Fetches sitemap.xml, merges URLs
6. **Batch Scrape** (if meta enabled) → Scrapes each URL for metadata
7. **Save to DB** → Results stored in Supabase (crawls + crawl_results tables)
8. **User views/exports** → Data retrieved from Supabase

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript 5.5.3** - Type safety
- **Vite 5.4.2** - Build tool and dev server
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React 0.344.0** - Icon library (chosen for lightweight, modern icons)

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Built-in authentication
  - Row-Level Security (RLS)
  - Edge Functions (Deno runtime)
- **@supabase/supabase-js 2.57.4** - Supabase client library

### External APIs
- **Firecrawl API** - Web crawling and scraping service
  - Used instead of Puppeteer/Playwright for serverless compatibility
  - Handles JavaScript rendering, rate limiting, retries

### Dev Tools
- **ESLint** - Code linting
- **PostCSS & Autoprefixer** - CSS processing
- **TypeScript ESLint** - TypeScript-specific linting

---

## Folder & File Structure

```
project/
├── .env                          # Environment variables (API keys)
├── .gitignore                    # Git ignore patterns
├── index.html                    # HTML entry point
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript root config
├── tsconfig.app.json             # TypeScript app config
├── tsconfig.node.json            # TypeScript Node config
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── eslint.config.js              # ESLint configuration
│
├── src/
│   ├── main.tsx                  # React entry point, renders App
│   ├── App.tsx                   # Main app component, routing logic
│   ├── index.css                 # Global styles, Tailwind imports
│   ├── vite-env.d.ts             # Vite type definitions
│   │
│   ├── components/               # All React components
│   │   ├── Auth.tsx              # Login/signup form
│   │   ├── Crawler.tsx           # Main crawling interface (850+ lines)
│   │   ├── SavedCrawls.tsx       # List of saved crawls with filters
│   │   ├── CrawlDetails.tsx      # Single crawl detail view
│   │   ├── CrawlResultsTable.tsx # Data table component
│   │   ├── TokenUsage.tsx        # Token usage dashboard
│   │   ├── Notification.tsx      # Toast notification component
│   │   ├── LoadingModal.tsx      # Loading modal with cancel button
│   │   ├── AnalysisToggleBar.tsx # Analysis module toggle UI
│   │   │
│   │   └── seo-intelligence/     # SEO analysis modules
│   │       ├── SEOIntelligence.tsx      # Main SEO dashboard
│   │       ├── ModuleSelector.tsx       # Module selection UI
│   │       ├── ModuleCard.tsx           # Individual module card
│   │       ├── UrlFilter.tsx            # URL filtering component
│   │       ├── BrokenLinkChecker.tsx    # Find broken links
│   │       ├── CanonicalValidator.tsx   # Validate canonical tags
│   │       ├── DuplicateMetaFinder.tsx  # Find duplicate meta tags
│   │       ├── ImageAnalyzer.tsx        # Analyze images & alt text
│   │       ├── ImageUsageMapper.tsx     # Map image usage across pages
│   │       ├── PaginationHreflangValidator.tsx # Check hreflang
│   │       ├── RedirectTracker.tsx      # Track redirects
│   │       ├── RobotsChecker.tsx        # Check robots meta tags
│   │       ├── SchemaValidator.tsx      # Validate schema markup
│   │       └── SocialMetaChecker.tsx    # Check Open Graph/Twitter
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication context provider
│   │
│   ├── hooks/
│   │   └── useNotification.ts    # Custom hook for notifications
│   │
│   └── lib/
│       ├── supabase.ts           # Supabase client setup + types
│       ├── firecrawl.ts          # Firecrawl API wrapper functions
│       └── crawlCache.ts         # Cache management functions
│
└── supabase/
    ├── functions/                # Edge Functions (Deno runtime)
    │   ├── firecrawl-proxy/
    │   │   └── index.ts          # Proxies Firecrawl API requests
    │   ├── analyze-images/
    │   │   └── index.ts          # Image analysis edge function
    │   ├── analyze-image-usage/
    │   │   └── index.ts          # Image usage mapping
    │   ├── analyze-pagination-hreflang/
    │   │   └── index.ts          # Pagination & hreflang analysis
    │   ├── analyze-schema/
    │   │   └── index.ts          # Schema markup validation
    │   └── analyze-social-meta/
    │       └── index.ts          # Social meta tag analysis
    │
    └── migrations/               # Database migration files
        ├── 20251107155130_create_crawls_tables.sql
        ├── 20251107161956_add_page_analysis_columns.sql
        ├── 20251107171442_add_new_analysis_modules.sql
        ├── 20251107181538_add_crawl_jobs_tracking.sql
        ├── 20251107184852_add_token_tracking_columns.sql
        ├── 20251107200313_create_seo_intelligence_tables.sql
        ├── 20251107203329_create_separate_seo_analyses_table.sql
        ├── 20251108000000_add_crawl_cache.sql
        ├── 20251109000000_add_keywords_tracking.sql
        └── 20251110233707_add_asset_audit_schema.sql
```

### File Explanations

#### Root Config Files
- **index.html**: Minimal HTML with `<div id="root">`, loads main.tsx
- **package.json**: Lists all dependencies, defines scripts (dev, build, lint)
- **vite.config.ts**: Configures Vite with React plugin, optimizes lucide-react
- **tailwind.config.js**: Custom theme (zero border radius, Source Code Pro font, gray scale)
- **tsconfig.json**: Root TypeScript config, references app and node configs

#### Source Files
- **main.tsx**: Creates React root, renders App in StrictMode
- **App.tsx**: Main app shell with AuthContext, view routing, navigation
- **index.css**: Imports Tailwind, defines font, custom animations

#### Components
- **Auth.tsx**: Email/password auth form with sign up/sign in toggle
- **Crawler.tsx**: Core crawling logic, domain input, analysis modules, results table
- **SavedCrawls.tsx**: List view with search, tag filters, delete actions
- **CrawlDetails.tsx**: Single crawl view with CSV export, results table
- **CrawlResultsTable.tsx**: Spreadsheet-like table with checkboxes, sorting, analysis actions
- **TokenUsage.tsx**: Dashboard showing total tokens/cost, activity history table
- **Notification.tsx**: Toast notification with auto-dismiss
- **LoadingModal.tsx**: Centered modal with spinner and cancel button
- **AnalysisToggleBar.tsx**: Configurable modules for analysis (H1, H2, status, etc.)

#### Contexts & Hooks
- **AuthContext.tsx**: Manages user auth state, provides signIn/signUp/signOut methods
- **useNotification.ts**: Hook for showing success/error notifications

#### Library Files
- **supabase.ts**: Initializes Supabase client, exports TypeScript interfaces
- **firecrawl.ts**: Wrapper functions for Firecrawl API (mapSite, scrapeUrl, crawlSite)
- **crawlCache.ts**: Functions to cache crawl results in Supabase

#### Edge Functions
- **firecrawl-proxy**: Proxies all Firecrawl API requests (map, scrape, status checks)
- **analyze-***: SEO intelligence modules that process crawled data

#### Migrations
- Sequential SQL files that create tables, add columns, set up RLS policies

---

## Database Schema

### Tables

#### 1. `crawls`
Stores metadata about each crawl job.

```sql
CREATE TABLE crawls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  total_urls INTEGER NOT NULL DEFAULT 0,
  included_meta BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  tokens_used INTEGER,
  tokens_cost NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Columns:**
- `id`: Unique identifier
- `user_id`: Owner of the crawl (foreign key to auth.users)
- `domain`: Website domain crawled
- `name`: Optional custom name
- `total_urls`: Number of URLs discovered
- `included_meta`: Whether metadata was extracted
- `tags`: Array of tags for organization
- `tokens_used`: Firecrawl API credits used
- `tokens_cost`: Cost in USD
- `created_at`, `updated_at`: Timestamps

**Indexes:**
- `user_id` (for filtering by user)
- `created_at` (for sorting)

#### 2. `crawl_results`
Stores individual page data from crawls.

```sql
CREATE TABLE crawl_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id UUID NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  h1_tags TEXT[],
  h2_tags TEXT[],
  h3_tags TEXT[],
  h4_tags TEXT[],
  h5_tags TEXT[],
  h6_tags TEXT[],
  images TEXT[],
  links TEXT[],
  analyzed BOOLEAN DEFAULT false,
  status_code INTEGER,
  indexable BOOLEAN,
  canonical_url TEXT,
  word_count INTEGER,
  images_without_alt INTEGER,
  kw_1 TEXT, kw_2 TEXT, kw_3 TEXT, kw_4 TEXT, kw_5 TEXT,
  kw_6 TEXT, kw_7 TEXT, kw_8 TEXT, kw_9 TEXT, kw_10 TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Columns:**
- `crawl_id`: References parent crawl
- `url`: Page URL
- `title`, `description`: Meta tags
- `h1_tags` through `h6_tags`: Arrays of heading text
- `images`, `links`: Arrays of URLs
- `analyzed`: Flag indicating if page was analyzed
- `status_code`: HTTP response code
- `indexable`: Whether page can be indexed
- `canonical_url`: Canonical tag value
- `word_count`: Total words on page
- `images_without_alt`: Count of images missing alt text
- `kw_1` through `kw_10`: Meta keywords
- `metadata`: Additional JSON data

#### 3. `crawl_cache`
Caches crawled page data to avoid re-crawling.

```sql
CREATE TABLE crawl_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  metadata JSONB,
  links JSONB,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, url)
);
```

#### 4. `seo_analyses`
Stores SEO intelligence analysis results.

```sql
CREATE TABLE seo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  tags TEXT[],
  tokens_used INTEGER,
  tokens_cost NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5. `asset_audit`
Tracks asset (image, CSS, JS) usage across pages.

```sql
CREATE TABLE asset_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES seo_analyses(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  used_on_pages TEXT[],
  usage_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Row-Level Security (RLS)

All tables have RLS enabled. Policies ensure users can only access their own data.

**Example Policy (crawls table):**
```sql
-- Users can view their own crawls
CREATE POLICY "Users can view own crawls"
  ON crawls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own crawls
CREATE POLICY "Users can insert own crawls"
  ON crawls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own crawls
CREATE POLICY "Users can update own crawls"
  ON crawls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own crawls
CREATE POLICY "Users can delete own crawls"
  ON crawls FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

Similar policies exist for all other tables.

---

## API Integration

### Firecrawl API

**Base URL:** `https://api.firecrawl.dev`

**Authentication:** Bearer token in Authorization header

#### Endpoints Used

##### 1. `/v1/map` (POST)
Maps all URLs on a website.

**Request:**
```json
{
  "url": "https://example.com",
  "limit": 5000,
  "includeSubdomains": false,
  "search": null
}
```

**Response:**
```json
{
  "id": "job-id-12345",
  "status": "scraping",
  "links": ["https://example.com", "https://example.com/about", ...]
}
```

If `status === "completed"`, returns full links array. Otherwise, poll status with GET `/v1/map/{id}`.

##### 2. `/v1/scrape` (POST)
Scrapes a single page.

**Request:**
```json
{
  "url": "https://example.com/page",
  "formats": ["html", "markdown", "links", "metadata"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "html": "<html>...</html>",
    "markdown": "# Page Title\n...",
    "metadata": {
      "title": "Page Title",
      "description": "Page description",
      "statusCode": 200
    },
    "links": ["https://example.com/other"]
  },
  "creditsUsed": 1
}
```

### Supabase Client

**Initialization:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Common Operations:**

```typescript
// Query data
const { data, error } = await supabase
  .from('crawls')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Insert data
const { data, error } = await supabase
  .from('crawls')
  .insert({ user_id: userId, domain: 'example.com', ... })
  .select()
  .single();

// Update data
const { error } = await supabase
  .from('crawls')
  .update({ name: 'New Name' })
  .eq('id', crawlId);

// Delete data
const { error } = await supabase
  .from('crawls')
  .delete()
  .eq('id', crawlId);
```

### Edge Function Proxy

All Firecrawl requests go through `firecrawl-proxy` edge function to:
1. Hide API key from frontend
2. Add CORS headers
3. Handle timeouts (2 minutes for map, 30 seconds for scrape)
4. Parse errors consistently

**Usage:**
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/firecrawl-proxy`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      endpoint: '/v1/map',
      method: 'POST',
      body: { url: 'https://example.com' },
      apiKey: firecrawlApiKey
    })
  }
);
```

---

## Component Architecture

### Core Components

#### 1. App.tsx
**Purpose:** Main app shell, handles routing between views.

**State:**
- `currentView`: 'crawl' | 'saved' | 'details' | 'tokens'
- `activeCrawlTab`: 'crawler' | 'seo'
- `selectedCrawlId`: string | null
- `refreshTrigger`: number (forces re-render of SavedCrawls)

**UI Structure:**
```
<AuthProvider>
  {user ? (
    <>
      <Header> (sticky, with sign out button)
      <Nav> (Scrape, Saved Crawls, Token Usage tabs)
      <Main>
        {currentView === 'crawl' && (
          <Tabs> (Website Crawler | SEO Intelligence)
          {activeCrawlTab === 'crawler' && <Crawler />}
          {activeCrawlTab === 'seo' && <SEOIntelligence />}
        )}
        {currentView === 'saved' && <SavedCrawls />}
        {currentView === 'details' && <CrawlDetails />}
        {currentView === 'tokens' && <TokenUsage />}
      </Main>
      <Notification />
    </>
  ) : (
    <Auth />
  )}
</AuthProvider>
```

#### 2. Crawler.tsx
**Purpose:** Main crawling interface.

**State:**
- `domain`: string
- `maxUrls`: number (1-500)
- `includeMeta`: boolean
- `isLoading`: boolean
- `results`: SitemapEntry[]
- `selectedUrls`: Set<string>
- `analyzingUrls`: Set<string>
- `activeModules`: string[] (status, metaTitle, h1, etc.)
- `tokensUsed`, `tokensCost`: number
- `currentCrawlId`: string | null

**Logic Flow:**

1. **handleCrawl():**
   - Validates domain input
   - Creates crawl record in DB
   - Calls `/v1/map` via edge function
   - If job ID returned, polls status every 5 seconds
   - Once complete, fetches sitemap.xml and merges URLs
   - If `includeMeta` is true, scrapes each URL in batches of 5
   - Updates `results` state with metadata
   - Tracks tokens used

2. **analyzeUrl(url):**
   - Calls `/v1/scrape` for single URL
   - Parses HTML with DOMParser
   - Extracts data based on `activeModules`
   - Updates result in state

3. **handleSave():**
   - Saves/updates crawl record in `crawls` table
   - Inserts all results into `crawl_results` table
   - Calls `onSaveSuccess()` callback

4. **exportToCSV():**
   - Builds CSV from results
   - Includes dynamic columns based on analysis data
   - Downloads file

**UI Components:**
- Domain input
- Max URLs input (number)
- Include Meta toggle (switch)
- Analysis module toggle bar
- Start Crawl button
- Results table with checkboxes
- Analyze selected button
- Export CSV / Save Crawl buttons

#### 3. CrawlResultsTable.tsx
**Purpose:** Spreadsheet-like table for results.

**Props:**
- `results`: SitemapEntry[]
- `includeMeta`: boolean
- `selectedUrls`: Set<string>
- `analyzingUrls`: Set<string>
- `onSelectAll`, `onSelectUrl`, `onAnalyzeUrl`: callbacks

**Features:**
- Sticky header
- Checkbox column for selection
- Row numbers
- Clickable URLs (open in new tab)
- Dynamic columns based on analyzed data:
  - Status Code
  - Indexability
  - Canonical URL
  - Word Count
  - H1-H6 (multiple columns per heading level)
  - Images count
  - Links count
  - Images missing alt text
  - Keywords (KW-1 through KW-10)
- "Analyze" button for unanalyzed rows
- Checkmark for analyzed rows
- Spinner for rows being analyzed

**Styling:**
- 11px font size for data density
- Gray borders
- Truncated text with title tooltips
- Hover row highlight

#### 4. SavedCrawls.tsx
**Purpose:** List all saved crawls with search/filter.

**State:**
- `crawls`: Crawl[]
- `filteredCrawls`: Crawl[]
- `searchQuery`: string
- `selectedTag`: string | null
- `allTags`: string[]

**Features:**
- Search input (filters by domain or name)
- Tag filter buttons (shows all unique tags)
- Crawl cards with:
  - Name/domain
  - URL count
  - Created date
  - Tags
  - "With Metadata" badge
  - View button (opens CrawlDetails)
  - Delete button (with confirmation)

#### 5. CrawlDetails.tsx
**Purpose:** View single crawl with full data.

**State:**
- `crawl`: Crawl | null
- `results`: CrawlResult[]
- `currentTab`: 'crawl' | 'seo'

**Features:**
- Back button
- Crawl name, domain, metadata
- Export CSV button
- Tabs (Crawl Results | SEO Intelligence)
- CrawlResultsTable (read-only, no actions)

#### 6. TokenUsage.tsx
**Purpose:** Dashboard for token usage.

**State:**
- `activities`: TokenActivity[]
- `totalTokens`, `totalCost`: number

**Features:**
- Summary cards (total tokens, total cost)
- Activity history table:
  - Activity name
  - Type (Crawler | SEO)
  - Date & time
  - Tokens used
  - Cost
- Auto-refreshes every 5 seconds

### Shared Components

#### Notification.tsx
Toast notification with auto-dismiss.

**Props:**
- `type`: 'success' | 'error'
- `message`: string
- `onClose`: () => void
- `duration`: number (default 5000ms)

**Styling:**
- Fixed top-right
- Slide-in animation
- Green/red color scheme
- Close button

#### LoadingModal.tsx
Modal with spinner and cancel button.

**Props:**
- `isOpen`: boolean
- `onCancel`: () => void
- `message`: string

**Styling:**
- Full-screen overlay (black 50% opacity)
- Centered white card
- Thick black border
- Large spinner
- Cancel button

#### AnalysisToggleBar.tsx
Configurable analysis modules.

**Props:**
- `activeModules`: string[]
- `setActiveModules`: React.Dispatch<SetStateAction<string[]>>

**Features:**
- Persists to localStorage
- 16 modules (status, metaTitle, h1-h6, images, links, keywords, etc.)
- Toggle buttons with icons
- Active count display

---

## UI/UX Design System

### Design Philosophy
- **Brutalist aesthetic**: Zero border radius, thick borders, stark contrasts
- **Data density**: Small fonts, tight spacing, maximize information per screen
- **Professional**: Black/gray/white color scheme, monospace font
- **Utilitarian**: Function over form, no unnecessary decorations

### Color Palette

```javascript
colors: {
  gray: {
    50: '#f9fafb',   // Lightest backgrounds
    100: '#f3f4f6',  // Section backgrounds
    200: '#e5e7eb',  // Borders (light)
    300: '#d1d5db',  // Borders (default)
    400: '#9ca3af',  // Placeholder text
    500: '#6b7280',  // Secondary text
    600: '#4b5563',  // Primary buttons, icons
    700: '#374151',  // Hover states
    800: '#1f2937',  // Dark text
    900: '#111827',  // Primary text, main buttons
    950: '#030712',  // Darkest
  }
}
```

**Usage:**
- Backgrounds: white, gray-50, gray-100
- Text: gray-900 (primary), gray-600 (secondary), gray-500 (tertiary)
- Borders: gray-300 (default), gray-200 (subtle)
- Buttons: gray-900 (primary), gray-600 (secondary), gray-100 (tertiary)
- Hover: gray-800 (dark buttons), gray-200 (light buttons)

### Typography

**Font Family:**
```css
font-family: 'Source Code Pro', monospace;
```
Loaded from Google Fonts in index.css.

**Font Sizes:**
- `text-xs`: 0.75rem (12px) - Table data, badges
- `text-sm`: 0.875rem (14px) - Body text, labels
- `text-base`: 1rem (16px) - Default
- `text-lg`: 1.125rem (18px) - Large body
- `text-xl`: 1.25rem (20px) - Subheadings
- `text-2xl`: 1.5rem (24px) - Section headings
- `text-3xl`: 1.875rem (30px) - Page titles

**Font Weights:**
- `font-medium`: 500 - Buttons, labels
- `font-semibold`: 600 - Table headers
- `font-bold`: 700 - Headings

### Spacing System

Uses Tailwind's 8px grid:
- `p-1`: 0.25rem (4px)
- `p-2`: 0.5rem (8px)
- `p-3`: 0.75rem (12px)
- `p-4`: 1rem (16px)
- `p-6`: 1.5rem (24px)
- `p-8`: 2rem (32px)

**Common Patterns:**
- Card padding: `p-8`
- Button padding: `px-4 py-2` or `px-6 py-3`
- Input padding: `px-4 py-3`
- Section margins: `mb-8`

### Border Radius

**Override:** All border radius removed (`borderRadius: { none: '0', DEFAULT: '0' }`).

Every element is sharp-cornered.

### Transitions

```javascript
transitionDuration: { DEFAULT: '200ms' },
transitionTimingFunction: { DEFAULT: 'ease-in-out' },
```

Applied to:
- Button hover states
- Color changes
- Background changes

### Layout Patterns

#### Card
```jsx
<div className="bg-white shadow-sm border border-gray-300 p-8">
  {/* content */}
</div>
```

#### Button (Primary)
```jsx
<button className="px-6 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors">
  Click Me
</button>
```

#### Button (Secondary)
```jsx
<button className="px-4 py-2 bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors">
  Click Me
</button>
```

#### Input
```jsx
<input className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-colors" />
```

#### Table
```jsx
<table className="border-collapse" style={{ fontSize: '11px' }}>
  <thead className="sticky top-0 bg-gray-100">
    <tr>
      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700">
        Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-300 px-2 py-0.5">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

### Icons

**Library:** Lucide React

**Usage:**
```jsx
import { Search, Loader2, CheckCircle } from 'lucide-react';

<Search className="w-5 h-5 text-gray-600" />
<Loader2 className="w-5 h-5 animate-spin text-gray-600" />
```

**Sizes:**
- `w-3 h-3`: 12px (small badges)
- `w-4 h-4`: 16px (buttons, inline)
- `w-5 h-5`: 20px (default)
- `w-6 h-6`: 24px (large buttons)
- `w-8 h-8`: 32px (loading states)

### Animations

**Slide-in (Notification):**
```css
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
```

**Spinner:**
Built-in Tailwind: `animate-spin` on `<Loader2>` icon.

---

## State Management

### Strategy
**No global state library.** Uses React's built-in state management:

1. **Context API** for authentication (AuthContext)
2. **Local component state** for everything else
3. **Props drilling** for parent-child communication
4. **Callbacks** for child-to-parent communication
5. **Supabase** as server state source of truth

### AuthContext

**Purpose:** Manage user authentication state globally.

**State:**
- `user`: User | null
- `session`: Session | null
- `loading`: boolean

**Methods:**
- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`

**Usage:**
```jsx
const { user, signIn, signOut } = useAuth();

if (!user) return <Auth />;
```

### Component State Patterns

#### Form State
```jsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

#### Data Fetching State
```jsx
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('table').select();
      if (error) throw error;
      setData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
```

#### Selection State
```jsx
const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

const toggleUrlSelection = (url: string) => {
  setSelectedUrls(prev => {
    const newSet = new Set(prev);
    if (newSet.has(url)) {
      newSet.delete(url);
    } else {
      newSet.add(url);
    }
    return newSet;
  });
};
```

#### Modal State
```jsx
const [showModal, setShowModal] = useState(false);
const [modalData, setModalData] = useState<Data | null>(null);

const openModal = (data: Data) => {
  setModalData(data);
  setShowModal(true);
};

const closeModal = () => {
  setShowModal(false);
  setModalData(null);
};
```

### Local Storage

**Analysis Modules:**
Persisted to `localStorage` as JSON:
```javascript
const STORAGE_KEY = 'webcrawler_activeModules';

export const loadActiveModules = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultModules();
    }
  }
  return getDefaultModules();
};

export const saveActiveModules = (modules: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
};
```

---

## Data Flow

### Crawl Flow (End-to-End)

```
User enters domain "example.com"
  │
  ├─> Frontend: handleCrawl() in Crawler.tsx
  │     - Validates input
  │     - Creates crawl record in Supabase (crawls table)
  │     - Sets currentCrawlId state
  │
  ├─> Frontend → Supabase Edge Function (firecrawl-proxy)
  │     POST /functions/v1/firecrawl-proxy
  │     { endpoint: '/v1/map', body: { url: '...' } }
  │
  ├─> Edge Function → Firecrawl API
  │     POST https://api.firecrawl.dev/v1/map
  │     Returns: { id: 'job-123', status: 'scraping' }
  │
  ├─> Frontend: Poll job status every 5 seconds
  │     GET /v1/map/job-123 (via edge function)
  │     Until status === 'completed'
  │
  ├─> Firecrawl returns: { links: [...1000 URLs...] }
  │
  ├─> Frontend: Fetch sitemap.xml
  │     GET https://example.com/sitemap.xml
  │     Parse <loc> tags, extract URLs
  │     Merge with Firecrawl links (dedupe)
  │
  ├─> Frontend: If includeMeta === true
  │     For each URL (in batches of 5):
  │       POST /v1/scrape { url: '...' }
  │       Extract: title, description, status
  │       Update results state
  │       Track tokens used
  │
  ├─> User: Clicks "Save Crawl"
  │     handleSave() in Crawler.tsx
  │
  ├─> Frontend → Supabase:
  │     UPDATE crawls SET name, total_urls, tags
  │     INSERT INTO crawl_results (bulk insert all URLs)
  │
  └─> Success notification shown
```

### Analysis Flow

```
User selects URLs, clicks "Analyze X URLs"
  │
  ├─> Frontend: handleAnalyzeSelected() in Crawler.tsx
  │     Opens LoadingModal
  │     For each selected URL:
  │
  ├─> analyzeUrl(url)
  │     POST /v1/scrape { url: '...', formats: ['html'] }
  │
  ├─> Parse HTML with DOMParser
  │     Extract based on activeModules:
  │       - status: response.status
  │       - metaTitle: <title> tag
  │       - metaDescription: <meta name="description">
  │       - indexable: <meta name="robots"> (check for noindex)
  │       - canonical: <link rel="canonical">
  │       - wordCount: count words in body text
  │       - h1-h6: Array.from(doc.querySelectorAll('h1'))
  │       - images: Array.from(doc.querySelectorAll('img'))
  │       - links: Array.from(doc.querySelectorAll('a'))
  │       - imageAlts: count images without alt attribute
  │       - keywords: <meta name="keywords">
  │
  ├─> Update result in state:
  │     setResults(prev => prev.map(r =>
  │       r.url === url ? { ...r, ...analysisData, analyzed: true } : r
  │     ))
  │
  ├─> Track tokens:
  │     setTokensUsed(prev => prev + creditsUsed)
  │     updateTokensInDatabase(newTotal)
  │
  └─> Close LoadingModal, show success notification
```

### Authentication Flow

```
User opens app
  │
  ├─> AuthProvider: useEffect runs
  │     supabase.auth.getSession()
  │     Sets user, session state
  │
  ├─> If user exists: Render authenticated UI
  │
  └─> If no user: Render <Auth /> component
        │
        ├─> User enters email/password
        │     Clicks "Sign In" or "Sign Up"
        │
        ├─> Frontend: signIn() or signUp()
        │     supabase.auth.signInWithPassword()
        │     or supabase.auth.signUp()
        │
        ├─> Supabase validates credentials
        │     Creates session, returns user object
        │
        ├─> AuthProvider: onAuthStateChange listener fires
        │     Updates user, session state
        │
        └─> App re-renders with authenticated UI
```

### Export Flow

```
User clicks "Export CSV"
  │
  ├─> Frontend: exportToCSV() in Crawler or CrawlDetails
  │
  ├─> Build CSV data:
  │     1. Determine columns (dynamic based on results)
  │     2. Build headers array
  │     3. Map results to rows
  │     4. Escape quotes, join with commas
  │     5. Add UTF-8 BOM (\uFEFF) for Excel compatibility
  │
  ├─> Create Blob:
  │     new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  │
  ├─> Create download link:
  │     URL.createObjectURL(blob)
  │     <a> element with download attribute
  │
  └─> Programmatically click link, remove from DOM
```

---

## Step-by-Step Rebuild Guide

### Phase 1: Environment Setup on Replit

#### 1.1 Create Replit Project
1. Go to Replit.com
2. Click "Create Repl"
3. Select "React TypeScript" template
4. Name it "web-scraper"

#### 1.2 Install Dependencies
In Replit shell:
```bash
npm install @supabase/supabase-js@2.57.4
npm install lucide-react@0.344.0
npm install -D tailwindcss@3.4.1 postcss@8.4.35 autoprefixer@10.4.18
```

#### 1.3 Configure Tailwind CSS
Create `tailwind.config.js`:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Source Code Pro', 'monospace'],
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-in-out',
      },
    },
  },
  plugins: [],
};
```

Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Update `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-800;
  }

  body {
    @apply font-mono bg-white text-gray-900;
    font-family: 'Source Code Pro', monospace;
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
```

#### 1.4 Set Up Environment Variables
Create `.env` file in root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key
```

**Where to get these:**
- Supabase: Sign up at supabase.com, create project, find in Settings > API
- Firecrawl: Sign up at firecrawl.dev, get API key from dashboard

### Phase 2: Database Setup

#### 2.1 Create Supabase Project
1. Go to supabase.com
2. Create new project
3. Wait for provisioning

#### 2.2 Run Migrations
In Supabase SQL Editor, run each migration file in order:

**First migration (create_crawls_tables.sql):**
```sql
CREATE TABLE crawls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT,
  total_urls INTEGER NOT NULL DEFAULT 0,
  included_meta BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  tokens_used INTEGER,
  tokens_cost NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawls_user_id ON crawls(user_id);
CREATE INDEX idx_crawls_created_at ON crawls(created_at);

ALTER TABLE crawls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crawls"
  ON crawls FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crawls"
  ON crawls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crawls"
  ON crawls FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own crawls"
  ON crawls FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Repeat for crawl_results, crawl_cache, seo_analyses, etc.
```

*(Copy all migration files from the project's supabase/migrations/ folder)*

### Phase 3: Core Infrastructure

#### 3.1 Supabase Client
Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript interfaces
export interface Crawl {
  id: string;
  user_id: string;
  domain: string;
  name: string | null;
  total_urls: number;
  included_meta: boolean;
  tags: string[] | null;
  tokens_used: number | null;
  tokens_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlResult {
  id: string;
  crawl_id: string;
  url: string;
  title: string | null;
  description: string | null;
  h1_tags: string[] | null;
  h2_tags: string[] | null;
  h3_tags: string[] | null;
  h4_tags: string[] | null;
  h5_tags: string[] | null;
  h6_tags: string[] | null;
  images: string[] | null;
  links: string[] | null;
  analyzed: boolean;
  status_code: number | null;
  indexable: boolean | null;
  canonical_url: string | null;
  word_count: number | null;
  images_without_alt: number | null;
  created_at: string;
}
```

#### 3.2 Firecrawl Client
Create `src/lib/firecrawl.ts`:
```typescript
const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface FirecrawlProxyRequest {
  endpoint: string;
  body?: any;
  apiKey?: string;
  method?: string;
}

export async function callFirecrawl(request: FirecrawlProxyRequest) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      ...request,
      apiKey: request.apiKey || FIRECRAWL_API_KEY,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Firecrawl request failed');
  }

  return await response.json();
}

export async function scrapeUrl(url: string) {
  return await callFirecrawl({
    endpoint: '/v1/scrape',
    method: 'POST',
    body: {
      url,
      formats: ['markdown', 'links'],
    },
  });
}

export async function mapSite(domain: string, limit: number = 50) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  const mapResult = await callFirecrawl({
    endpoint: '/v1/map',
    method: 'POST',
    body: {
      url,
      limit,
      includeSubdomains: false,
      search: null,
    },
  });

  let discoveredUrls = mapResult.links || [];

  // Fetch and merge sitemap.xml
  try {
    const sitemapUrl = `${url}/sitemap.xml`;
    const sitemapContent = await fetchTextFile(sitemapUrl);

    if (sitemapContent) {
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        const sitemapUrls = urlMatches.map(match =>
          match.replace(/<loc>|<\/loc>/g, '').trim()
        );

        const uniqueUrls = new Set([...discoveredUrls, ...sitemapUrls]);
        discoveredUrls = Array.from(uniqueUrls);
      }
    }
  } catch (err) {
    console.log('Could not fetch sitemap, using Firecrawl results only');
  }

  return {
    ...mapResult,
    links: discoveredUrls,
  };
}

export async function fetchTextFile(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        endpoint: '/fetch-text',
        method: 'GET',
        url,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.content || null;
  } catch (err) {
    return null;
  }
}
```

#### 3.3 Auth Context
Create `src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = { user, session, loading, signUp, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

#### 3.4 Notification Hook
Create `src/hooks/useNotification.ts`:
```typescript
import { useState, useCallback } from 'react';

export interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message });
  }, []);

  const showError = useCallback((message: string) => {
    setNotification({ type: 'error', message });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, showSuccess, showError, clearNotification };
}
```

### Phase 4: Components

#### 4.1 Notification Component
Create `src/components/Notification.tsx`:
*(Copy full component from project files)*

#### 4.2 Auth Component
Create `src/components/Auth.tsx`:
*(Copy full component from project files)*

#### 4.3 LoadingModal Component
Create `src/components/LoadingModal.tsx`:
*(Copy full component from project files)*

#### 4.4 AnalysisToggleBar Component
Create `src/components/AnalysisToggleBar.tsx`:
*(Copy full component from project files)*

#### 4.5 CrawlResultsTable Component
Create `src/components/CrawlResultsTable.tsx`:
*(Copy full component from project files)*

#### 4.6 Crawler Component
Create `src/components/Crawler.tsx`:
*(Copy full component from project files - this is the largest, 1000+ lines)*

#### 4.7 SavedCrawls Component
Create `src/components/SavedCrawls.tsx`:
*(Copy full component from project files)*

#### 4.8 CrawlDetails Component
Create `src/components/CrawlDetails.tsx`:
*(Copy full component from project files)*

#### 4.9 TokenUsage Component
Create `src/components/TokenUsage.tsx`:
*(Copy full component from project files)*

### Phase 5: Main App

#### 5.1 App Component
Create `src/App.tsx`:
*(Copy full component from project files)*

#### 5.2 Main Entry
Update `src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Phase 6: Edge Functions (Optional but Recommended)

**Note:** Replit doesn't natively support Supabase Edge Functions. You'll deploy these separately in Supabase CLI.

#### 6.1 Install Supabase CLI
On your local machine (not Replit):
```bash
npm install -g supabase
supabase login
```

#### 6.2 Link to Project
```bash
supabase link --project-ref your-project-ref
```

#### 6.3 Create Edge Function
```bash
supabase functions new firecrawl-proxy
```

Copy `supabase/functions/firecrawl-proxy/index.ts` from project files.

#### 6.4 Deploy
```bash
supabase functions deploy firecrawl-proxy
```

### Phase 7: Testing & Debugging

#### 7.1 Test Authentication
1. Run app in Replit
2. Try signing up with email/password
3. Verify user created in Supabase Dashboard > Authentication > Users

#### 7.2 Test Crawling
1. Sign in
2. Enter a domain (e.g., "example.com")
3. Set max URLs to 5 for quick test
4. Enable "Include Meta Data"
5. Click "Start Crawl"
6. Verify:
   - LoadingModal appears
   - URLs discovered
   - Metadata extracted
   - Results table populated

#### 7.3 Test Saving
1. After crawl completes, click "Save Crawl"
2. Enter name and tags
3. Click Save
4. Navigate to "Saved Crawls"
5. Verify crawl appears

#### 7.4 Test Export
1. In Crawler or CrawlDetails, click "Export CSV"
2. Verify CSV downloads
3. Open in Excel/Sheets, check formatting

### Phase 8: SEO Intelligence (Advanced)

If you want to rebuild SEO intelligence modules:

1. Copy `src/components/seo-intelligence/` folder
2. Copy respective edge functions from `supabase/functions/`
3. Deploy edge functions
4. Update App.tsx to include SEOIntelligence component in tabs

*(These modules are complex and can be added incrementally)*

---

## Performance Optimizations

### 1. Batch Processing
**Problem:** Scraping 100 URLs sequentially takes too long.

**Solution:** Batch requests (5 at a time):
```typescript
for (let i = 0; i < urls.length; i += batchSize) {
  const batch = urls.slice(i, i + batchSize);
  const results = await Promise.all(batch.map(scrapeUrl));
  // Process results
}
```

### 2. Abort Controllers
**Problem:** User wants to cancel long-running operations.

**Solution:** Use AbortController:
```typescript
const abortController = new AbortController();

// In async operation:
if (abortController.signal.aborted) {
  throw new Error('Cancelled');
}

// Cancel button:
<button onClick={() => abortController.abort()}>Cancel</button>
```

### 3. Memoization
**Problem:** CrawlResultsTable re-renders unnecessarily.

**Potential:** Wrap in React.memo() if performance issues:
```typescript
export const CrawlResultsTable = React.memo(({ ... }) => {
  // component
});
```

### 4. Virtual Scrolling
**Problem:** Rendering 1000+ table rows is slow.

**Potential:** Use react-window or react-virtualized for large tables.

*(Not currently implemented, but recommended for 500+ rows)*

### 5. Debouncing
**Problem:** Search input triggers too many re-renders.

**Potential:** Debounce search input:
```typescript
import { useMemo } from 'react';
import debounce from 'lodash.debounce';

const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

---

## Security Considerations

### 1. Row-Level Security (RLS)
**Critical:** All Supabase tables MUST have RLS enabled with policies.

**Verify:**
- Users can only access their own data
- `auth.uid()` checks in every policy
- No policies use `USING (true)`

### 2. API Key Security
**Critical:** NEVER expose Firecrawl API key in frontend.

**Solution:** All Firecrawl requests go through edge function proxy.

### 3. Input Validation
**Frontend:**
- Validate domain format
- Sanitize user inputs
- Limit maxUrls to reasonable range (1-500)

**Backend:**
- Edge functions should validate requests
- Check API key presence
- Reject malformed data

### 4. Authentication
**Supabase handles:**
- Password hashing (bcrypt)
- Session management (JWT)
- Email verification (optional)

**Your responsibility:**
- Check `user` state before rendering sensitive data
- Sign out properly (clears session)

### 5. CORS
**Edge functions MUST include CORS headers:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Handle OPTIONS
if (req.method === "OPTIONS") {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// Include in all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

---

## Deployment

### Replit Deployment
1. In Replit, click "Deploy"
2. Choose "Autoscale" or "Reserved VM"
3. Set environment variables in Secrets tab
4. Deploy

**Custom domain:**
- Go to "Deployments" > "Custom Domains"
- Add your domain (requires paid plan)

### Vercel/Netlify Deployment (Alternative)
1. Push code to GitHub
2. Connect repo to Vercel/Netlify
3. Set environment variables
4. Deploy

**Build settings:**
- Build command: `npm run build`
- Output directory: `dist`

### Supabase Edge Functions
Always deploy separately:
```bash
supabase functions deploy firecrawl-proxy
supabase functions deploy analyze-images
# etc.
```

---

## Troubleshooting

### Common Issues

#### 1. "Missing Supabase environment variables"
**Cause:** `.env` file not loaded or keys incorrect.

**Fix:**
- Check `.env` exists in project root
- Verify keys match Supabase Dashboard > Settings > API
- Restart dev server

#### 2. "Failed to fetch"
**Cause:** CORS issue or edge function not deployed.

**Fix:**
- Check edge function deployed: `supabase functions list`
- Verify CORS headers in edge function
- Check Network tab for exact error

#### 3. "Firecrawl API error"
**Cause:** Invalid API key or rate limit exceeded.

**Fix:**
- Check VITE_FIRECRAWL_API_KEY in `.env`
- Verify key in Firecrawl dashboard
- Check credit balance

#### 4. "RLS policy violation"
**Cause:** Missing or incorrect RLS policy.

**Fix:**
- Check Supabase Dashboard > Database > Policies
- Verify `auth.uid() = user_id` in policies
- Test queries in SQL Editor with `SET LOCAL role TO authenticated;`

#### 5. Crawl stuck "Processing..."
**Cause:** Edge function timeout or Firecrawl job failed.

**Fix:**
- Check edge function logs in Supabase Dashboard
- Increase timeout in edge function (max 2 minutes)
- Reduce maxUrls to test

---

## Next Steps & Extensions

### Features to Add

1. **Scheduled Crawls**
   - Use Supabase cron jobs or external scheduler
   - Store schedule in database
   - Send email notifications

2. **Crawl Comparison**
   - Compare two crawls of same domain
   - Highlight added/removed URLs
   - Track changes over time

3. **Advanced Filters**
   - Filter by status code range
   - Filter by title/description keywords
   - RegEx URL filtering

4. **Bulk Actions**
   - Export multiple crawls at once
   - Delete multiple crawls
   - Merge crawls

5. **Real-time Collaboration**
   - Share crawls with team
   - Real-time updates with Supabase Realtime
   - Comments on URLs

6. **API Endpoints**
   - REST API for programmatic access
   - Webhooks for crawl completion

7. **Visualization**
   - Charts for status code distribution
   - Word count histogram
   - Sitemap tree view

### Refactoring Opportunities

1. **Component Splitting**
   - Crawler.tsx is 1000+ lines, split into:
     - CrawlerForm
     - CrawlerResults
     - AnalysisManager

2. **Custom Hooks**
   - `useCrawl()` - Handles crawl logic
   - `useAnalysis()` - Handles analysis logic
   - `useExport()` - Handles CSV export

3. **Type Safety**
   - Generate TypeScript types from Supabase schema
   - Use zod for runtime validation

4. **Testing**
   - Unit tests for utilities
   - Integration tests for components
   - E2E tests with Playwright

---

## Conclusion

This guide provides a complete technical breakdown of the Web-Scraper application. By following these steps, you can rebuild the entire app from scratch on Replit or any other platform.

**Key Takeaways:**
- **Architecture:** React frontend + Supabase backend + Firecrawl API
- **Design:** Brutalist aesthetic, data-dense UI, professional gray color scheme
- **State:** Context for auth, local state for everything else
- **Security:** RLS on all tables, API key hidden in edge function
- **Performance:** Batch processing, abort controllers, caching

**Remember:**
1. Always enable RLS on Supabase tables
2. Never expose API keys in frontend
3. Test thoroughly before deploying
4. Monitor token usage to control costs

Good luck rebuilding!
