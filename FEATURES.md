# Website Crawler - Features & Workflow

## Overview
A comprehensive website crawling and SEO analysis tool that helps you discover, analyze, and manage website pages. Built with React, TypeScript, and Supabase.

---

## Core Features

### 1. **Website Crawling**
- Extract all URLs from any website using Firecrawl API
- Customize the maximum number of URLs to extract (1-500 pages)
- Automatic sitemap discovery and URL collection
- Real-time crawling progress with loading indicators

### 2. **Metadata Extraction**
- Optional metadata extraction for each discovered page
- Captures meta titles and descriptions
- Toggle metadata extraction on/off to save API credits
- Parallel processing for faster metadata collection

### 3. **Page Analysis**
- Deep analysis of individual pages including:
  - **H1 Tags**: All H1 headings found on the page
  - **H2 Tags**: All H2 headings found on the page
  - **H3 Tags**: All H3 headings found on the page
  - **Images**: Count and details of all images (src, alt)
  - **Links**: Count and details of all links (href, text)
- HTML parsing using DOMParser
- Limit of 20 images and 50 links per page for performance
- Individual URL analysis with "Analyze" button
- Batch analysis for multiple selected URLs
- Analysis results displayed in table format

### 4. **Authentication System**
- Secure email/password authentication via Supabase Auth
- User registration and login
- Password management
- Session persistence
- Row Level Security (RLS) ensures users only see their own data

### 5. **Save & Manage Crawls**
- Save crawl results to database with:
  - Custom name (optional)
  - Tags for organization (comma-separated)
  - Automatic domain and timestamp tracking
  - Full analysis data preservation
- View saved crawls library
- Search crawls by domain or name
- Filter crawls by tags
- Delete unwanted crawls
- View detailed results of any saved crawl

### 6. **CSV Export**
- Export crawl results to CSV format
- UTF-8 BOM encoding for Excel compatibility
- Dynamic columns based on available data:
  - URL (always included)
  - Meta Title (if metadata was extracted)
  - Meta Description (if metadata was extracted)
  - H1 Tags (if analysis was performed)
  - H2 Tags (if analysis was performed)
  - H3 Tags (if analysis was performed)
  - Image Count (if analysis was performed)
  - Link Count (if analysis was performed)
- Proper CSV escaping for special characters
- Export from active crawl or saved crawls

### 7. **URL Selection System**
- Checkbox selection for individual URLs
- "Select All" functionality
- Visual feedback for selected URLs
- Bulk operations on selected URLs
- Batch analysis for selected URLs only

### 8. **Expandable Analysis View**
- Inline expandable rows for analyzed pages
- Chevron icons to expand/collapse analysis details
- Clean table format showing all analysis data
- Scrollable columns for long lists of tags
- Visual loading indicators during analysis

---

## Workflow

### **Step 1: Initial Setup**
1. User visits the application
2. System prompts for login/registration if not authenticated
3. User creates account or logs in with existing credentials
4. Dashboard loads with "New Crawl" tab active

### **Step 2: Start a Crawl**
1. Enter target website domain (e.g., `example.com`)
2. Set maximum URLs to extract (default: 50, max: 500)
3. Toggle "Include Meta Data" option (default: ON)
   - ON: Extracts meta titles and descriptions for each page
   - OFF: Only collects URLs (faster, uses fewer API credits)
4. Click "Start Crawl" button
5. System processes the request:
   - Sends request to Firecrawl API via Supabase Edge Function
   - Discovers all pages on the website
   - If metadata is enabled, scrapes each page for title/description
   - Displays results in real-time as they're collected

### **Step 3: Review Results**
1. Results appear in a table with:
   - Checkbox for selection
   - URL with clickable link
   - Meta Title (if extracted)
   - Meta Description (if extracted)
   - Analyze button (for individual analysis)
2. User can:
   - Click URLs to visit pages in new tab
   - Select individual URLs via checkboxes
   - Select all URLs at once
   - Scroll through all discovered pages

### **Step 4: Analyze Pages (Optional)**
**Option A: Individual Analysis**
1. Click "Analyze" button next to any URL
2. System scrapes the page and parses HTML
3. Loading spinner shows analysis in progress
4. Chevron icon appears when analysis completes
5. Click chevron to expand/collapse analysis table

**Option B: Batch Analysis**
1. Select multiple URLs using checkboxes
2. Click "Analyze X URLs" button at top
3. System analyzes all selected URLs in parallel
4. Each URL shows loading spinner during analysis
5. Chevron icons appear as each analysis completes
6. Click any chevron to view that page's analysis

**Analysis Table Shows:**
- H1 Tags column with all H1 headings
- H2 Tags column with all H2 headings
- H3 Tags column with all H3 headings
- Images column with count
- Links column with count
- Each column is scrollable if content is long
- Counts shown in header (e.g., "H1 Tags (3)")

### **Step 5: Export Data**
1. Click "Export CSV" button at top of results
2. System generates CSV file with:
   - All URLs from crawl
   - Metadata if it was extracted
   - Analysis data if any pages were analyzed
3. File downloads automatically
4. Can be opened in Excel, Google Sheets, etc.
5. All special characters properly escaped

### **Step 6: Save Crawl (Optional)**
1. Click "Save Crawl" button (only visible when logged in)
2. Modal appears with fields:
   - **Name**: Custom name for this crawl (optional)
   - **Tags**: Comma-separated tags (e.g., "seo, audit, competitor")
3. Click "Save" button
4. System stores to database:
   - Crawl metadata (domain, name, tags, timestamp)
   - All URLs with their metadata
   - All analysis data for analyzed pages
5. Success notification appears
6. Crawl appears in "Saved Crawls" tab

### **Step 7: Access Saved Crawls**
1. Navigate to "Saved Crawls" tab
2. View all previously saved crawls with:
   - Crawl name or domain
   - Number of URLs
   - Date saved
   - Tags
   - "With Metadata" badge if metadata was included
3. Use search bar to find crawls by domain or name
4. Click tag filters to show only crawls with specific tags
5. Click "View" icon to see full details
6. Click "Delete" icon to remove a crawl

### **Step 8: View Saved Crawl Details**
1. Click view icon on any saved crawl
2. System loads:
   - Crawl metadata (name, domain, date, tags)
   - All saved URLs
   - All saved metadata
   - All saved analysis data
3. Results displayed in same table format
4. Analysis can be expanded/collapsed with chevrons
5. Click "Export CSV" to export saved data
6. Click "Back to saved crawls" to return to library

---

## Technical Architecture

### **Frontend**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- Component-based architecture:
  - `Crawler`: Main crawling interface
  - `SavedCrawls`: Crawl library management
  - `CrawlDetails`: Detailed view of saved crawls
  - `Auth`: Authentication UI
  - `Notification`: Toast notifications

### **Backend**
- Supabase for backend services:
  - PostgreSQL database
  - Row Level Security (RLS)
  - Supabase Auth
  - Edge Functions for API proxy

### **Database Schema**
**Table: `crawls`**
- `id`: UUID primary key
- `user_id`: UUID foreign key to auth.users
- `domain`: Text (website domain)
- `name`: Text (optional custom name)
- `total_urls`: Integer (count of URLs found)
- `included_meta`: Boolean (whether metadata was extracted)
- `tags`: Text array (user-defined tags)
- `created_at`: Timestamp

**Table: `crawl_results`**
- `id`: UUID primary key
- `crawl_id`: UUID foreign key to crawls
- `url`: Text (page URL)
- `title`: Text (meta title, nullable)
- `description`: Text (meta description, nullable)
- `h1_tags`: Text array (H1 headings, nullable)
- `h2_tags`: Text array (H2 headings, nullable)
- `h3_tags`: Text array (H3 headings, nullable)
- `images`: JSONB (image data, nullable)
- `links`: JSONB (link data, nullable)
- `analyzed`: Boolean (whether page was analyzed)
- `created_at`: Timestamp

### **API Integration**
- Firecrawl API for website crawling and scraping
- Supabase Edge Function (`firecrawl-proxy`) proxies requests
- Keeps API keys secure on server-side
- Supports both `/v1/map` (sitemap) and `/v1/scrape` (page content) endpoints

### **Security**
- All API keys stored in environment variables
- Supabase Edge Functions hide keys from client
- Row Level Security ensures data isolation
- Users can only access their own crawls
- Authentication required for saving crawls
- CORS properly configured

---

## Use Cases

### **SEO Auditing**
- Discover all pages on a website
- Analyze heading structure (H1, H2, H3)
- Review meta titles and descriptions
- Identify pages missing key SEO elements
- Export data for client reports

### **Competitor Analysis**
- Crawl competitor websites
- Analyze their content structure
- Compare heading strategies
- Track changes over time with saved crawls
- Tag crawls by competitor for organization

### **Content Inventory**
- Get complete list of all website pages
- Export to spreadsheet for content audit
- Identify orphan pages
- Plan content updates
- Track website growth

### **Migration Planning**
- Document existing site structure before migration
- Create comprehensive URL inventory
- Export data for redirect mapping
- Save historical snapshots
- Compare before/after states

### **Link Building Research**
- Discover all pages on potential link sources
- Analyze content quality via headings
- Export data for outreach lists
- Track analyzed sites with tags
- Save promising sites for later review

---

## Tips & Best Practices

1. **Start Small**: Test with a lower URL limit first to understand API usage
2. **Use Tags**: Tag crawls by project, client, or purpose for easy filtering
3. **Save Often**: Save important crawls to avoid losing analysis work
4. **Batch Analyze**: Select multiple URLs to analyze them efficiently
5. **Export Early**: Export CSV before browser refresh to avoid data loss
6. **Name Crawls**: Give descriptive names to saved crawls for easy reference
7. **Clean Up**: Delete old crawls you no longer need
8. **Search & Filter**: Use search and tag filters to find crawls quickly

---

## Future Enhancement Ideas

- Bulk URL upload from sitemap XML
- Custom scraping rules
- Scheduled recurring crawls
- Change detection and alerts
- Link graph visualization
- Broken link detection
- Page speed insights
- Mobile vs desktop comparison
- Screenshot capture
- PDF report generation
- API access for automation
- Team collaboration features
- Crawl comparison tool
