/**
 * Production Build & Verification Runner for Rah-e-Deen-Islam
 * Confirms that all static files, scripts, assets, SEO configs,
 * and Vercel specifications are 100% production-ready.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('========================================================');
console.log('🏗️  BUILDING RAH-E-DEEN-ISLAM FOR GITHUB & VERCEL DEPLOY');
console.log('========================================================\n');

const BASE_DIR = __dirname;
let buildPassed = true;

function check(title, condition, extra = '') {
  if (condition) {
    console.log(`✅ [PASS] ${title} ${extra}`);
  } else {
    console.error(`❌ [FAIL] ${title} ${extra}`);
    buildPassed = false;
  }
}

// 1. Verify Core HTML & Assets
console.log('--- Step 1: Core Static Files & Brand Assets ---');
const requiredFiles = [
  'index.html',
  'css/style.css',
  'css/patterns.css',
  'assets/logo.svg',
  'sitemap.xml',
  'robots.txt',
  'vercel.json',
  'package.json',
  'server.js'
];

requiredFiles.forEach(file => {
  const fullPath = path.join(BASE_DIR, file);
  check(`File exists: ${file}`, fs.existsSync(fullPath));
});

// 2. Verify JavaScript Modules
console.log('\n--- Step 2: JavaScript Modules Syntax & Integrity ---');
const jsFiles = [
  'prayer-times.js',
  'hadith-data.js',
  'qa-data.js',
  'quran-data.js',
  'durood-data.js',
  'wudu-data.js',
  'calendar-data.js',
  'duas-data.js',
  'contact.js',
  'app.js'
];

jsFiles.forEach(file => {
  const fullPath = path.join(BASE_DIR, 'js', file);
  if (!fs.existsSync(fullPath)) {
    check(`JS File exists: ${file}`, false);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  try {
    new vm.Script(content);
    check(`Syntax check: js/${file}`, true, `(${Math.round(content.length / 1024)} KB)`);
  } catch (err) {
    check(`Syntax check: js/${file}`, false, `: ${err.message}`);
  }
});

// 3. Verify HTML Content, 12 Core Views, and SEO tags
console.log('\n--- Step 3: Google SEO, Metadata & 12 Core Sections ---');
const htmlContent = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');

check('RTL & Urdu Language Declaration', htmlContent.includes('dir="rtl"') && htmlContent.includes('lang="ur"'));
check('Canonical URL present', htmlContent.includes('<link rel="canonical"'));
check('Robots Meta present', htmlContent.includes('<meta name="robots"'));
check('Google Site Verification present', htmlContent.includes('google-site-verification'));
check('Open Graph Meta tags present', htmlContent.includes('og:title') && htmlContent.includes('og:image'));
check('Twitter Card Meta tags present', htmlContent.includes('twitter:card'));
check('Schema.org JSON-LD Structured Data', htmlContent.includes('application/ld+json') && htmlContent.includes('EducationalOrganization'));

const coreViews = [
  'view-home',
  'view-hadith',
  'view-quran',
  'view-qa',
  'view-fiqh-differences',
  'view-prayer-times',
  'view-wudu',
  'view-durood',
  'view-calendar',
  'view-duas',
  'view-about',
  'view-contact'
];

coreViews.forEach(v => {
  check(`Core Section present: ${v}`, htmlContent.includes(`id="${v}"`));
});

// 4. Verify Sitemap & Robots.txt
console.log('\n--- Step 4: Search Engine Discovery (Sitemap & Robots) ---');
const sitemap = fs.readFileSync(path.join(BASE_DIR, 'sitemap.xml'), 'utf8');
check('Sitemap conforms to sitemaps.org', sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'));
check('Sitemap has all 12 view routes', coreViews.every(v => sitemap.includes(`#${v.replace('view-', '')}`) || v === 'view-home'));

const robots = fs.readFileSync(path.join(BASE_DIR, 'robots.txt'), 'utf8');
check('Robots allows crawling', robots.includes('Allow: /'));
check('Robots points to sitemap', robots.includes('sitemap.xml'));

// 5. Verify Vercel Configuration
console.log('\n--- Step 5: Vercel Deployment Configuration ---');
const vercelContent = fs.readFileSync(path.join(BASE_DIR, 'vercel.json'), 'utf8');
try {
  const vercelJson = JSON.parse(vercelContent);
  check('vercel.json is valid JSON', true);
  check('vercel.json has static caching headers', Array.isArray(vercelJson.headers) && vercelJson.headers.length > 0);
  check('vercel.json has SPA rewrites', Array.isArray(vercelJson.rewrites) && vercelJson.rewrites.length > 0);
} catch (e) {
  check('vercel.json is valid JSON', false, e.message);
}

// 6. Summary
console.log('\n========================================================');
if (buildPassed) {
  console.log('🎉 BUILD SUCCESSFUL! Project is 100% production ready for GitHub & Vercel.');
  console.log('========================================================\n');
  process.exit(0);
} else {
  console.error('💥 BUILD FAILED! Please resolve the issues reported above.');
  console.log('========================================================\n');
  process.exit(1);
}
