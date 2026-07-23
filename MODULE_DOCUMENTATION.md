# Module Documentation

## Overview

This application provides two powerful modules for comprehensive website analysis: **Website Crawler** for content discovery and basic SEO metrics, and **SEO Intelligence** for advanced technical SEO auditing. Both modules integrate seamlessly with Supabase for data persistence and Firecrawl API for web scraping capabilities.

---

# Module 1: Website Crawler

## Purpose

The Website Crawler module enables users to systematically discover, extract, and analyze all pages on any website. It provides essential SEO metrics, content structure analysis, and keyword tracking capabilities, making it ideal for content audits, site inventories, and baseline SEO assessments.

## Core Features

### 1. Intelligent Website Crawling
- **Automatic URL Discovery**: Leverages Firecrawl's map endpoint to discover all accessible URLs on target domains
- **Configurable Depth**: Control crawl scope with adjustable URL limits (1-500 pages)
- **Real-time Progress**: Live updates as pages are discovered and processed
- **Error Handling**: Gracefully handles timeouts and failed scrapes while continuing the crawl

### 2. Comprehensive Metadata Extraction
- **Optional Metadata Scraping**: Toggle metadata extraction on/off to control API usage
- **Core SEO Elements**:
  - Page titles (meta title tags)
  - Meta descriptions
  - Status codes
  - Indexability indicators
  - Canonical URL detection
- **Parallel Processing**: Concurrent requests for faster data collection
- **Smart Caching**: 7-day cache system to avoid redundant API calls

### 3. Advanced Page Analysis
When analyzing individual pages, the crawler extracts:
- **Heading Structure**: Complete hierarchy of H1-H6 tags for content outline analysis
- **Word Count**: Total word count for content length assessment
- **Image Analysis**:
  - Total image count
  - Image sources and alt text
  - Images missing alt text (accessibility flag)
- **Link Inventory**:
  - Internal and external link counts
  - Link destinations and anchor text
  - Link structure analysis
- **Canonical URLs**: Self-referencing and cross-domain canonical detection

### 4. AI-Powered Keyword Extraction
- **Automatic Keyword Discovery**: AI analysis extracts top 10 most relevant keywords per page
- **Module Toggle System**: Enable/disable keyword extraction via Analysis Toggle Bar
- **Smart Integration**: Keywords extracted during page analysis and stored in database
- **Token Tracking**: Real-time token usage and cost monitoring for AI operations

### 5. Flexible URL Selection System
- **Individual Selection**: Checkbox-based selection for targeted analysis
- **Bulk Selection**: "Select All" functionality for batch operations
- **Visual Feedback**: Clear indicators for selected URLs
- **Batch Processing**: Analyze multiple pages simultaneously

### 6. Data Persistence & Management
- **Save Complete Crawls**: Store entire crawl datasets with metadata
- **Custom Organization**:
  - Custom crawl names
  - Tag-based categorization
  - Automatic timestamp tracking
  - Domain association
- **Crawl Library**:
  - Search by domain or name
  - Filter by tags
  - View detailed results
  - Delete outdated crawls
- **Analysis Preservation**: All analysis data saved for future reference

### 7. Professional Data Export
- **CSV Export**: Download complete datasets in Excel-compatible format
- **UTF-8 BOM Encoding**: Ensures proper character rendering in Excel
- **Dynamic Columns**: Exports only populated data fields
- **Proper Escaping**: Handles special characters and line breaks correctly
- **Included Data**:
  - URLs
  - Meta titles and descriptions
  - All heading tags (H1-H6)
  - Image and link counts
  - Keywords (when analyzed)
  - Indexability status
  - Canonical URLs

### 8. Analysis Toggle Bar
Modular analysis system allowing users to enable/disable specific features:
- **Keywords Extraction**: AI-powered keyword discovery
- **Schema Detection**: Structured data identification
- **Social Meta Tags**: Open Graph and Twitter Card validation
- **Pagination Analysis**: rel=next/prev validation
- **User Preferences**: Settings persist across sessions

## Benefits

### For SEO Professionals
- **Rapid Site Audits**: Quickly inventory entire websites for comprehensive SEO analysis
- **Content Gap Analysis**: Identify pages lacking proper meta descriptions, titles, or heading structure
- **Keyword Mapping**: Understand keyword usage across site pages
- **Client Reporting**: Export professional datasets for client deliverables

### For Content Teams
- **Content Inventory**: Complete catalog of all website pages and content
- **Structure Analysis**: Understand content hierarchy through heading analysis
- **Image Audit**: Identify images missing alt text for accessibility improvements
- **Word Count Tracking**: Monitor content depth across pages

### For Web Developers
- **Migration Planning**: Document complete site structure before migrations
- **URL Mapping**: Export comprehensive URL lists for redirect planning
- **Technical Audits**: Identify indexability issues and canonical problems
- **Quality Assurance**: Verify proper implementation of meta tags and structure

### For Digital Marketers
- **Competitor Analysis**: Crawl and analyze competitor websites
- **Link Building Research**: Discover content opportunities on target sites
- **Content Strategy**: Analyze successful content structures
- **Historical Tracking**: Save crawls over time to track changes

## Outputs

### Real-time Table View
- Interactive table displaying all discovered URLs
- Expandable rows showing detailed analysis data
- Loading indicators during processing
- Sortable and filterable results

### Saved Crawl Library
- Organized list of all saved crawls
- Metadata preview (domain, date, URL count)
- Tag-based organization
- Quick access to detailed results

### CSV Export Files
Structured spreadsheet containing:
```
URL | Title | Description | Status Code | Indexable | Canonical URL |
Word Count | H1 Tags | H2 Tags | H3 Tags | H4 Tags | H5 Tags | H6 Tags |
Images Count | Links Count | Images Without Alt |
Keywords 1-10 | Analyzed
```

### Database Storage
Complete crawl data persisted in Supabase:
- **crawls** table: Crawl metadata and configuration
- **crawl_results** table: Individual page data and analysis
- **crawl_cache** table: 7-day cache of scraped content

## Integrations

### Firecrawl API
- **Map Endpoint**: Discovers all URLs on target domains
- **Scrape Endpoint**: Extracts page content and metadata
- **Proxy Integration**: Secure API key management via Supabase Edge Functions

### Supabase Backend
- **PostgreSQL Database**: Reliable data storage with RLS security
- **Edge Functions**: Server-side API proxying
- **Authentication**: Secure user management and session handling
- **Real-time Updates**: Live data synchronization

### AI Services
- **Keyword Extraction**: LLM-powered keyword identification (via Supabase Edge Functions)
- **Token Tracking**: Usage monitoring and cost calculation
- **Batch Processing**: Efficient handling of multiple analysis requests

## Roadmap

### Near-term Enhancements
- **Sitemap XML Upload**: Import URLs directly from XML sitemaps
- **Advanced Filters**: Filter crawl results by status code, word count, or missing elements
- **Custom Column Selection**: Choose which data fields to display in table
- **URL Pattern Matching**: Crawl specific URL patterns only
- **Duplicate Content Detection**: Identify similar or duplicate content across pages

### Medium-term Features
- **Scheduled Crawls**: Automatic recurring crawls with change detection
- **Comparison Tool**: Side-by-side comparison of multiple crawls
- **Visual Reports**: PDF generation with charts and insights
- **Bulk Operations**: Apply actions to multiple saved crawls
- **API Access**: RESTful API for programmatic access

### Long-term Vision
- **Link Graph Visualization**: Interactive visualization of internal link structure
- **Page Speed Integration**: Core Web Vitals and performance metrics
- **Mobile vs Desktop**: Comparative analysis across devices
- **Screenshot Capture**: Visual snapshots of analyzed pages
- **Team Collaboration**: Share crawls and collaborate on analysis
- **Change Alerts**: Email notifications for significant site changes

---

# Module 2: SEO Intelligence

## Purpose

The SEO Intelligence module provides advanced technical SEO auditing capabilities with 8 specialized analysis modules. It performs deep technical analysis of website architecture, crawlability, indexability, structured data, and international SEO implementation to identify critical issues that impact search engine visibility and user experience.

## Core Features

### 1. Comprehensive Site Crawling
- **Full Site Discovery**: Maps entire website structure using Firecrawl API
- **Configurable Limits**: Set maximum pages to crawl (up to 5000 pages)
- **Cost Estimation**: Shows estimated API costs before proceeding
- **Confirmation Workflow**: Review crawl scope before executing
- **Smart Caching**: 7-day cache prevents redundant API calls

### 2. Modular Analysis System
8 specialized modules that can be run individually or collectively:

#### Module 2.1: HTTP Redirect & Final URL Tracking
- **Redirect Chain Mapping**: Traces complete redirect paths
- **Loop Detection**: Identifies infinite redirect loops
- **Final URL Discovery**: Determines ultimate destination for each URL
- **Redirect Type Analysis**: Categorizes 301, 302, 307, 308 redirects
- **Chain Length Reporting**: Flags excessive redirect hops

#### Module 2.2: Robots.txt, llms.txt & Meta Robots
- **Robots.txt Parsing**: Analyzes crawl directives for all user agents
- **LLMs.txt Detection**: Checks AI crawler policies and instructions
- **Meta Robots Analysis**: Validates noindex, nofollow, and other directives
- **Crawlability Assessment**: Determines which pages are blocked from crawlers
- **Conflicting Rules Detection**: Identifies contradictory directives

#### Module 2.3: Canonical Validation
- **Self-Referencing Check**: Verifies pages reference themselves canonically
- **Cross-Domain Tracking**: Detects canonical tags pointing to external domains
- **Mismatch Detection**: Flags URLs where canonical differs from actual URL
- **Missing Canonical**: Identifies pages without canonical tags
- **Consolidation Issues**: Highlights potential duplicate content problems

#### Module 2.4: Duplicate Title / Description Detection
- **Duplicate Title Finder**: Groups pages sharing identical titles
- **Duplicate Description Finder**: Identifies pages with same meta descriptions
- **Frequency Analysis**: Shows how many pages share each duplicate
- **URL Grouping**: Lists all URLs affected by each duplicate
- **Missing Meta Detection**: Flags pages without titles or descriptions

#### Module 2.5: Broken Link Checker (Internal)
- **Internal Link Crawling**: Tests all internal links on each page
- **HTTP Status Validation**: Identifies 404s, 500s, and other errors
- **Redirect Detection**: Flags links pointing to redirecting URLs
- **Accessibility Testing**: Verifies all internal navigation works
- **Source Page Tracking**: Shows which pages contain broken links

#### Module 2.6: Schema.org Detection / Validator
- **JSON-LD Detection**: Identifies all structured data on pages
- **Schema Type Inventory**: Catalogs Organization, Article, Product, FAQPage, etc.
- **Validation**: Checks schema against Schema.org specifications
- **Multiple Schema Handling**: Detects pages with multiple schema types
- **Missing Schema Reporting**: Identifies pages that should have structured data

#### Module 2.7: Open Graph / Twitter Card Checker
- **Open Graph Validation**: Verifies og:title, og:description, og:image, og:type
- **Twitter Card Analysis**: Checks twitter:card, twitter:title, twitter:description, twitter:image
- **Image Validation**: Ensures social images are properly sized and accessible
- **Missing Tag Detection**: Flags incomplete social meta implementations
- **Preview Optimization**: Ensures proper social media sharing appearance

#### Module 2.8: Pagination & hreflang Validator
- **Pagination Link Validation**: Checks rel=next and rel=prev implementation
- **Reciprocal Validation**: Ensures bidirectional pagination links are correct
- **hreflang Detection**: Identifies international language/region targeting
- **Reciprocal hreflang Check**: Validates hreflang tags reference each other correctly
- **Missing hreflang**: Flags pages missing expected language alternatives

### 3. Flexible URL Filtering
- **Run All URLs**: Analyze entire site without restrictions
- **Pattern Matching**: Include/exclude URLs by regex patterns
- **Manual Selection**: Specify exact URLs to analyze
- **Wildcard Support**: Use * and ? for flexible matching
- **Multiple Filters**: Combine multiple patterns for precise targeting

### 4. Module Selection Interface
- **Visual Module Selector**: Grid view of all available modules
- **Individual Toggle**: Enable/disable specific modules
- **Run All**: Execute all selected modules sequentially
- **Run Individual**: Test single modules independently
- **Module Descriptions**: Clear explanations of each module's purpose

### 5. Token Tracking & Cost Management
- **Real-time Token Usage**: Live tracking of API consumption
- **Cost Calculation**: Automatic cost estimation at $0.001 per token
- **Module-specific Tracking**: Granular usage data per analysis module
- **Database Persistence**: Token usage saved with each analysis
- **Budget Monitoring**: Stay informed of API costs

### 6. Data Persistence & Analysis History
- **Save Complete Analyses**: Store all module results with metadata
- **Historical Tracking**: Access previous analyses anytime
- **Tag Organization**: Categorize analyses by project, client, or purpose
- **Result Comparison**: Compare analyses over time (future feature)

### 7. Advanced Results Display
- **Expandable Tables**: Drill down into detailed results
- **Issue Counts**: See total issues at a glance
- **Severity Indicators**: Visual cues for critical vs warning issues
- **URL Filtering**: Filter results by URL patterns within results
- **Export Capabilities**: Download results in CSV format (per module)

### 8. Loading & Progress Management
- **Modal Loading Indicators**: Clear status messages during processing
- **Cancel Operation**: Abort long-running analyses
- **Module Progress**: Track which module is currently executing
- **Error Handling**: Graceful failure with informative error messages

## Benefits

### For Technical SEO Specialists
- **Comprehensive Audits**: Run all 8 modules to catch every technical issue
- **Issue Prioritization**: Focus on critical problems like broken links and redirect loops
- **Structured Data Verification**: Ensure proper schema implementation for rich results
- **International SEO Validation**: Verify hreflang and pagination for multi-language sites

### For SEO Agencies
- **Client Reporting**: Generate detailed technical audit reports
- **Scalable Analysis**: Handle sites from small businesses to large enterprises
- **Historical Tracking**: Document improvements over time with saved analyses
- **Modular Pricing**: Run only necessary modules to control costs

### For Enterprise SEO Teams
- **Large Site Auditing**: Analyze up to 5000 pages per crawl
- **Multi-site Management**: Track multiple domains with tagging system
- **Data-Driven Decisions**: Base technical decisions on comprehensive data
- **Automated Monitoring**: Schedule regular checks for regression detection

### For Web Developers
- **Pre-launch Validation**: Check technical SEO before site launches
- **Migration Verification**: Ensure proper redirects and canonical implementation
- **Structured Data QA**: Validate schema.org markup accuracy
- **Broken Link Prevention**: Catch internal link issues before users do

## Outputs

### Module Result Cards
Each module displays:
- Total issues found
- Detailed breakdown by issue type
- Affected URLs with specifics
- Expandable details for each finding
- Visual severity indicators

### Comprehensive Analysis Report
When running all modules, receive:
- Executive summary with total issue count
- Module-by-module breakdown
- Critical issues highlighted
- Complete URL list with all findings
- Token usage and cost summary

### Database Storage
Complete analysis data in Supabase:
- **seo_analyses** table: Analysis metadata and token tracking
- Module-specific result tables for each analysis type
- Timestamp and user association
- Tag-based organization

### Export Files (Per Module)
CSV exports containing:
- URLs analyzed
- Issues detected
- Issue severity/type
- Detailed findings
- Recommendations (future enhancement)

## Integrations

### Firecrawl API
- **Map Endpoint**: Site structure discovery
- **Scrape Endpoint**: Page content and metadata extraction
- **Batch Processing**: Parallel analysis of multiple URLs
- **Error Handling**: Graceful degradation for failed requests

### Supabase Edge Functions
9 specialized Edge Functions for analysis:
1. **firecrawl-proxy**: Secure API key management
2. **analyze-redirects**: Redirect chain tracking
3. **analyze-robots**: Robots.txt and meta robots analysis
4. **analyze-canonical**: Canonical tag validation
5. **analyze-duplicates**: Duplicate content detection
6. **analyze-broken-links**: Internal link validation
7. **analyze-schema**: Structured data validation
8. **analyze-social-meta**: Social media tag validation
9. **analyze-pagination-hreflang**: International SEO validation

### Supabase Database
- **RLS Security**: User-specific data isolation
- **Efficient Storage**: Optimized schema for large datasets
- **Query Performance**: Indexed tables for fast retrieval
- **Data Integrity**: Foreign key constraints and validation

## Roadmap

### Near-term Enhancements
- **PDF Report Generation**: Professional audit reports with branding
- **Issue Severity Scoring**: Prioritize issues by SEO impact
- **Recommendation Engine**: Automated fix suggestions for each issue
- **Email Notifications**: Alerts when analyses complete
- **Bulk Export**: Export all module results in one file

### Medium-term Features
- **Scheduled Audits**: Automated weekly/monthly technical audits
- **Change Detection**: Alert when new issues appear
- **Issue Tracking**: Mark issues as resolved and track over time
- **Competitive Analysis**: Compare technical SEO against competitors
- **Custom Modules**: User-defined analysis rules and checks

### Long-term Vision
- **API Access**: Integrate with external tools and workflows
- **Team Collaboration**: Share analyses and assign remediation tasks
- **White Label Reports**: Branded reports for agency clients
- **Historical Trends**: Visualize technical SEO improvements over time
- **Automated Monitoring**: Continuous monitoring with instant alerts
- **Machine Learning**: Predict potential issues before they occur
- **Integration Hub**: Connect with Google Search Console, Analytics, etc.

---

## Comparison: Website Crawler vs SEO Intelligence

| Aspect | Website Crawler | SEO Intelligence |
|--------|----------------|------------------|
| **Primary Purpose** | Content discovery & basic SEO | Advanced technical SEO auditing |
| **Depth** | Basic metadata & structure | Deep technical analysis |
| **Speed** | Fast (basic scraping) | Moderate (comprehensive analysis) |
| **Best For** | Content audits, site inventory | Technical SEO problems |
| **Output** | URL lists with metadata | Issue reports with recommendations |
| **API Usage** | Lower (scraping only) | Higher (multiple analysis types) |
| **Learning Curve** | Simple, beginner-friendly | Advanced, for SEO professionals |
| **Analysis Modules** | 1 main module + toggles | 8 specialized modules |

## Recommended Workflow

### Initial Site Assessment
1. **Start with Website Crawler**: Get complete URL inventory and basic SEO metrics
2. **Export and Review**: Identify pages with missing titles, descriptions, or poor structure
3. **Switch to SEO Intelligence**: Run comprehensive technical audit on full site
4. **Review Module Results**: Prioritize issues by severity and impact

### Ongoing Monitoring
1. **Monthly Crawler Runs**: Track new pages and content changes
2. **Quarterly Intelligence Audits**: Deep technical validation
3. **Save Historical Data**: Compare results over time
4. **Export Reports**: Document improvements for stakeholders

### Pre-launch Validation
1. **Crawl Staging Site**: Ensure all pages are discovered
2. **Run All Intelligence Modules**: Catch technical issues before launch
3. **Fix Critical Issues**: Resolve redirects, broken links, and schema errors
4. **Re-audit**: Verify fixes before going live

---

## Technical Requirements

### API Keys Required
- **Firecrawl API Key**: For web scraping and crawling
- **Supabase Project**: For database and authentication

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Minimum 1920x1080 resolution recommended

### Data Limits
- **Website Crawler**: Up to 500 URLs per crawl
- **SEO Intelligence**: Up to 5000 pages per analysis
- **Storage**: Unlimited saved crawls per user

### Performance Notes
- Large crawls (>1000 pages) may take 5-15 minutes
- Analysis modules run sequentially to manage API rate limits
- Cache system reduces API calls for repeat analyses within 7 days

---

## Support & Resources

### Getting Started
1. Create account and log in
2. Start with Website Crawler on a small site (10-50 pages)
3. Review results and export CSV
4. Graduate to SEO Intelligence for technical audits

### Best Practices
- Always review cost estimates before large crawls
- Use URL filtering to focus on specific site sections
- Save important analyses with descriptive names and tags
- Export results immediately after completion
- Run crawler before intelligence for URL discovery

### Common Use Cases
- **SEO Audit**: Crawler (structure) + Intelligence (technical)
- **Content Inventory**: Crawler only with keyword extraction
- **Technical Validation**: Intelligence with all modules
- **Competitor Research**: Crawler for content analysis
- **Migration Planning**: Both modules for complete documentation
