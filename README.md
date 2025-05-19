# Sitemap Generator for UniversLivebox

This Node.js script generates XML sitemaps for the UniversLivebox website, complying with Google and Google News specifications.

## Features

- Standard sitemap generation (sitemap.xml)
- Google News sitemap generation (sitemap-news.xml) with author support
- Sitemap index generation (sitemap-index.xml)
- Automatic exploration of tags and categories
- Compliance with XML standards and Google specifications

## Prerequisites

- Node.js (version 12 or higher)
- npm (Node.js package manager)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/luisbaker/universlivebox_sitemaps.git
cd universlivebox_sitemaps
```

2. Install the required dependencies:
```bash
npm install
```

## Usage

### Manual Sitemap Generation

Run the script with the command:

```bash
npm run start:dynamic
```

The files will be generated in the `./sitemaps/` folder.

### Generated Files

- `sitemap.xml`: Standard sitemap with all website pages
- `sitemap-news.xml`: Google News sitemap with recent articles
- `sitemap-index.xml`: Index referencing all sitemaps
- `sitemap-tag-xxxx.xml`: Tag-specific sitemaps (if enough articles)
- `robots.txt`: With reference to the sitemap-index

If the number of articles exceeds Google's limits, the files will be automatically split (e.g., `sitemap1.xml`, `sitemap2.xml`, etc.).

## Automation

### Option 1: CRON Job on Server

To run the script automatically every hour (recommended for a news website):

1. Connect to your server via SSH
2. Open the crontab editor:
```bash
crontab -e
```

3. Add the following line:
```
0 * * * * cd /path/to/universlivebox_sitemaps && /usr/bin/node sitemap-generator-dynamic.js
```

This configuration will run the script at the top of every hour. To reduce server load during peak hours, you can configure execution at different intervals:

```
# Run every hour during the day (6am-11pm)
0 6-23 * * * cd /path/to/universlivebox_sitemaps && /usr/bin/node sitemap-generator-dynamic.js

# Run every 3 hours during the night (midnight-5am)
0 0,3 * * * cd /path/to/universlivebox_sitemaps && /usr/bin/node sitemap-generator-dynamic.js
```

### Option 2: GitHub Actions

To automate with GitHub Actions and run hourly, create a `.github/workflows/generate-sitemaps.yml` file:

```yaml
name: Generate Sitemaps

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:      # Allows manual triggering

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate sitemaps
        run: node sitemap-generator-dynamic.js
        
      - name: Commit and push changes
        run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email 'actions@github.com'
          git add sitemaps/
          git commit -m "Auto-update sitemaps" || echo "No changes to commit"
          git push
```

### Option 3: Automatic Deployment Script

Create a `deploy.sh` script that can be executed via a CRON job every hour:

```bash
#!/bin/bash

# Generate sitemaps
node sitemap-generator-dynamic.js

# Deploy to web server
scp -r sitemaps/* user@server:/path/to/www/

# Log execution
echo "Sitemaps generated and deployed on $(date)" >> deploy.log
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then configure a CRON job to run it every hour:
```
0 * * * * cd /path/to/universlivebox_sitemaps && ./deploy.sh
```

## Configuration

You can modify parameters in the files:

- `sitemap-generator-dynamic.js`: Main configuration
- `crawler.js`: Crawler configuration

Important parameters in `sitemap-generator-dynamic.js`:
```javascript
const CONFIG = {
  nomSite: 'UniversLivebox',
  domaine: 'https://universlivebox.com',
  // ... other parameters
};
```

## Contribution

Contributions are welcome! Feel free to open an issue or a pull request.

## Structure of Files

- `sitemap-generator.js`: Generates sitemaps from static data
- `crawler.js`: Module for crawling the site and extracting articles
- `sitemap-generator-dynamic.js`: Generates sitemaps from crawler data
- `package.json`: Project configuration and dependencies

## Integration with Your Site

For production use, it is recommended:

1. To adapt CSS selectors in `crawler.js` to the structure of your site
2. To run the script via a scheduled task (cron job)
3. To submit your sitemap index URL to Google Search Console

## Dependencies

- `fs`, `path`: Node.js modules for file management
- `xml2js`: Module for generating XML
- `axios`: HTTP client for web requests
- `cheerio`: HTML parser for extracting data from web pages

## Important Notes

- For Google News, only articles from the last 48 hours are included, as per Google's requirements
- Respect crawling etiquette by configuring reasonable delays between requests 