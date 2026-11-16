/**
 * Master Application Controller for Rah-e-Deen-Islam (راہِ دینِ اسلام)
 * Handles client-side routing, view rendering, search, filters, pagination,
 * copy-to-clipboard, modals, and prayer time countdowns.
 */

// Application State
const state = {
  currentRoute: 'home',
  currentLang: 'ur', // 'ur' or 'ar'
  hadith: {
    part: 1,
    page: 1,
    pageSize: 10,
    searchQuery: '',
    category: 'all'
  },
  qa: {
    filter: 'all',
    searchQuery: ''
  },
  prayer: {
    city: 'vehari',
    school: 1 // 1 = Hanafi, 0 = Shafi'i
  },
  durood: {
    category: 'all',
    searchQuery: ''
  },
  checklist: {}
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  initRouter();
  await initPrayerBar();
  renderCurrentView();
});

// Event Listeners
function initEventListeners() {
  // Mobile Nav Toggle
  const toggleBtn = document.getElementById('nav-toggle-btn');
  const mainNav = document.getElementById('main-nav');
  if (toggleBtn && mainNav) {
    toggleBtn.addEventListener('click', () => {
      mainNav.classList.toggle('mobile-open');
    });
  }

  // Navigation Links
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const route = el.getAttribute('data-route');
      navigateTo(route);
      if (mainNav && mainNav.classList.contains('mobile-open')) {
        mainNav.classList.remove('mobile-open');
      }
    });
  });

  // Language Buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  // Prayer City Dropdown in Quick Bar
  const citySelect = document.getElementById('quick-city-select');
  if (citySelect) {
    citySelect.addEventListener('change', async (e) => {
      state.prayer.city = e.target.value;
      await updatePrayerDisplay();
    });
  }
}

// Router
function initRouter() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    state.currentRoute = hash;
    renderCurrentView();
  });

  const initialHash = window.location.hash.replace('#', '') || 'home';
  state.currentRoute = initialHash;
}

function navigateTo(route) {
  window.location.hash = route;
  state.currentRoute = route;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentView() {
  // Update Active Nav Link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-route') === state.currentRoute) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  // Show active view
  const activeView = document.getElementById(`view-${state.currentRoute}`);
  if (activeView) {
    activeView.classList.add('active');
  } else {
    const homeView = document.getElementById('view-home');
    if (homeView) homeView.classList.add('active');
  }

  // Render specific module content
  switch (state.currentRoute) {
    case 'home':
      renderHomeHighlights();
      break;
    case 'hadith':
      renderHadithLibrary();
      break;
    case 'quran':
      renderQuranSection();
      break;
    case 'qa':
      renderQASection();
      break;
    case 'fiqh-differences':
      renderFiqhDifferencesSection();
      break;
    case 'durood':
      renderDuroodSection();
      break;
    case 'wudu':
      renderWuduSection();
      break;
    case 'prayer-times':
      renderPrayerTimesPage();
      break;
    case 'calendar':
      renderCalendarSection();
      break;
    case 'duas':
      renderDuasSection();
      break;
    case 'about':
      // Static content present in HTML
      break;
    case 'contact':
      // Form handlers ready
      break;
  }
}

// ==========================================
// Prayer Times Engine Integration
// ==========================================
async function initPrayerBar() {
  // Subscribe to automatic midnight date rollover in Pakistan Time (Asia/Karachi)
  if (window.prayerService) {
    window.prayerService.addListener(() => {
      console.log('[App] Prayer service notified date or timing update in PKT. Refreshing display...');
      updatePrayerDisplay();
    });
  }

  await updatePrayerDisplay();

  // Run Live Countdown every second (hours, minutes, seconds)
  setInterval(() => {
    if (window.prayerService && window.prayerService.currentTimings) {
      const nextInfo = window.prayerService.getNextPrayer();
      if (!nextInfo || !nextInfo.next) return;

      const next = nextInfo.next;
      const label = state.currentLang === 'ar' ? 'الوقت المتبقي لصلاة' : 'آئندہ وقت';

      // 1. Quick Bar countdown badge beside prayer timings
      const badge = document.getElementById('prayer-countdown-text');
      if (badge) {
        badge.textContent = `${label} ${next.nameUrdu}: ${nextInfo.countdownUrdu} ⏳`;
      }

      // 2. Full Page Prayer countdown element
      const pageCountdown = document.getElementById('page-prayer-countdown');
      if (pageCountdown) {
        pageCountdown.textContent = `${next.nameUrdu} (${nextInfo.countdownUrdu} باقی) ⏳`;
      }

      // 3. Card mini digits countdown
      const cardDigits = document.getElementById('card-countdown-digits');
      if (cardDigits) {
        cardDigits.textContent = nextInfo.countdownFormatted;
      }

      // 4. Highlight active and next prayers across chips and cards
      highlightActivePrayer(nextInfo.currentActive?.key, next.key);

      // 5. Automatic transition when prayer arrives
      if (nextInfo.totalRemainingSeconds === 0) {
        updatePrayerDisplay();
      }
    }
  }, 1000);
}

async function updatePrayerDisplay() {
  const timingsData = await window.prayerService.fetchTimings(state.prayer.city, state.prayer.school);
  if (!timingsData) return;

  const t = timingsData.timings;
  const t12 = timingsData.timings12 || {};

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Sync Dropdowns across quick bar and main page
  const quickSelect = document.getElementById('quick-city-select');
  if (quickSelect && quickSelect.value !== state.prayer.city) {
    quickSelect.value = state.prayer.city;
  }
  const pageSelect = document.getElementById('prayer-page-city-select');
  if (pageSelect && pageSelect.value !== state.prayer.city) {
    pageSelect.value = state.prayer.city;
  }
  const pageSchool = document.getElementById('prayer-page-school-select');
  if (pageSchool && parseInt(pageSchool.value, 10) !== state.prayer.school) {
    pageSchool.value = state.prayer.school;
  }

  // Set quick bar chip timings in authentic 12-HOUR format (e.g., 4:00 PM, 5:38 PM)
  setEl('time-tahajjud', t12.Tahajjud || t.Tahajjud);
  setEl('time-fajr', t12.Fajr || t.Fajr);
  setEl('time-sunrise', t12.Sunrise || t.Sunrise);
  setEl('time-ishraq', t12.Ishraq || t.Ishraq);
  setEl('time-chasht', t12.Chasht || t.Chasht);
  setEl('time-dhuhr', t12.Dhuhr || t.Dhuhr);
  setEl('time-asr', t12.Asr || t.Asr);
  setEl('time-maghrib', t12.Maghrib || t.Maghrib);
  setEl('time-awwabin', t12.Awwabin || t.Awwabin);
  setEl('time-isha', t12.Isha || t.Isha);

  // Top Bar Dates
  const gregorianEl = document.getElementById('top-bar-gregorian');
  const hijriEl = document.getElementById('top-bar-hijri');
  if (gregorianEl) gregorianEl.textContent = timingsData.dateGregorian;
  if (hijriEl) hijriEl.textContent = timingsData.dateHijri;

  // Source notice & Last Updated
  const sourceEl = document.getElementById('prayer-source-notice');
  if (sourceEl) sourceEl.textContent = timingsData.methodName;
  const updatedEl = document.getElementById('prayer-last-updated-notice');
  if (updatedEl) updatedEl.textContent = timingsData.lastUpdated;

  // Render the full dedicated prayer times dashboard if container exists
  renderPrayerTimesDashboard(timingsData);
}

function highlightActivePrayer(activeKey) {
  document.querySelectorAll('.prayer-chip').forEach(chip => {
    if (chip.getAttribute('data-prayer') === activeKey) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  // Also highlight on full dashboard cards if open
  document.querySelectorAll('.prayer-card-full').forEach(card => {
    if (card.getAttribute('data-prayer') === activeKey) {
      card.classList.add('active-prayer-card');
    } else {
      card.classList.remove('active-prayer-card');
    }
  });
}

// ==========================================
// Module: Home Highlights
// ==========================================
function renderHomeHighlights() {
  // Hadith of the day (First verified hadith)
  const hodContainer = document.getElementById('home-hadith-of-day');
  if (hodContainer && window.HADITH_DATABASE && window.HADITH_DATABASE.length > 0) {
    const h = window.HADITH_DATABASE[0];
    hodContainer.innerHTML = `
      <div class="hadith-card card-crest">
        <div class="hadith-meta">
          <span class="hadith-number-badge">حدیثِ مبارک #${h.hadithNumber}</span>
          <span class="hadith-grade-badge">${h.collection} • ${h.grade}</span>
        </div>
        <div class="hadith-arabic arabic-text">${h.arabic}</div>
        <div class="hadith-urdu urdu-text">${h.urdu}</div>
        <div class="hadith-section-box">
          <div class="hadith-section-title">✨ عملی رہنمائی / روزمرہ زندگی کا سبق</div>
          <p class="urdu-text" style="font-size:0.96rem;">${h.dailyLesson}</p>
        </div>
        <div class="hadith-actions">
          <button class="btn btn-sm btn-outline-gold" onclick="copyHadithText(${h.id})">📋 حوالہ کاپی کریں</button>
          <a href="${h.sourceUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-gold">اصل سند دیکھیں ↗</a>
        </div>
      </div>
    `;
  }
}

// ==========================================
// Module: Hadith Library (300 Hadiths, Parts 1, 2, 3)
// ==========================================
function renderHadithLibrary() {
  const container = document.getElementById('hadith-list-container');
  const paginationContainer = document.getElementById('hadith-pagination');
  if (!container || !window.HADITH_DATABASE) return;

  // Filter by Part (1: 1-100, 2: 101-200, 3: 201-300)
  let filtered = window.HADITH_DATABASE.filter(h => h.part === state.hadith.part);

  // Filter by Category
  if (state.hadith.category !== 'all') {
    filtered = filtered.filter(h => h.category === state.hadith.category);
  }

  // Filter by Search Query
  if (state.hadith.searchQuery) {
    const q = state.hadith.searchQuery.toLowerCase();
    filtered = filtered.filter(h => 
      h.urdu.toLowerCase().includes(q) ||
      h.arabic.toLowerCase().includes(q) ||
      String(h.hadithNumber).includes(q) ||
      h.explanation.toLowerCase().includes(q) ||
      h.category.toLowerCase().includes(q)
    );
  }

  // Pagination calculation
  const total = filtered.length;
  const totalPages = Math.ceil(total / state.hadith.pageSize) || 1;
  if (state.hadith.page > totalPages) state.hadith.page = 1;

  const startIndex = (state.hadith.page - 1) * state.hadith.pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + state.hadith.pageSize);

  // Render Items
  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--text-muted); font-size: 1.1rem;">کوئی حدیث مبارک تلاش کے معیار پر نہیں ملی۔ برائے مہربانی دوسرا لفظ تلاش کریں۔</p>
      </div>
    `;
  } else {
    container.innerHTML = pageItems.map(h => `
      <div class="hadith-card card-crest">
        <div class="hadith-meta">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="hadith-number-badge">حدیثِ مبارک #${h.hadithNumber}</span>
            <span style="font-size:0.88rem; color:var(--text-muted); font-weight:600;">[حصہ ${h.part} • ریکارڈ #${h.id}]</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="crescent-badge">${h.category}</span>
            <span class="hadith-grade-badge">${h.collection} • ${h.grade}</span>
          </div>
        </div>

        <div class="hadith-arabic arabic-text">${h.arabic}</div>
        <div class="hadith-urdu urdu-text">${h.urdu}</div>

        <div class="hadith-section-box">
          <div class="hadith-section-title">📖 تفصیلی فہم و تشریح</div>
          <p class="urdu-text" style="font-size: 0.98rem; color: var(--text-dark);">${h.explanation}</p>
        </div>

        <div class="hadith-section-box" style="background: var(--gold-50); border-color: rgba(212,175,55,0.3);">
          <div class="hadith-section-title" style="color: var(--gold-600);">✨ روزمرہ زندگی کا عملی سبق</div>
          <p class="urdu-text" style="font-size: 0.98rem;">${h.dailyLesson}</p>
        </div>

        <div class="hadith-actions">
          <button class="btn btn-sm btn-outline-gold" onclick="copyHadithText(${h.id})">📋 حوالہ و متن کاپی کریں</button>
          <button class="btn btn-sm btn-emerald" onclick="shareHadith(${h.id})">🔗 شیئر کریں</button>
          <a href="${h.sourceUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-gold">سنۃ ڈاٹ کام پر سند ↗</a>
        </div>
      </div>
    `).join('');
  }

  // Render Pagination Controls
  renderHadithPagination(totalPages, total);
}

function renderHadithPagination(totalPages, totalCount) {
  const container = document.getElementById('hadith-pagination');
  if (!container) return;

  let html = `
    <div style="width: 100%; text-align: center; margin-bottom: 12px; font-size: 0.92rem; color: var(--text-muted);">
      کل نتائج: <strong>${totalCount}</strong> احادیث • صفحہ <strong>${state.hadith.page}</strong> از <strong>${totalPages}</strong>
    </div>
  `;

  html += `<button class="page-btn" ${state.hadith.page === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="changeHadithPage(${state.hadith.page - 1})">❮ پچھلا</button>`;

  const maxButtons = 6;
  let startPage = Math.max(1, state.hadith.page - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === state.hadith.page ? 'active' : ''}" onclick="changeHadithPage(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" ${state.hadith.page === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="changeHadithPage(${state.hadith.page + 1})">اگلا ❯</button>`;

  container.innerHTML = html;
}

function setHadithPart(partNumber) {
  state.hadith.part = partNumber;
  state.hadith.page = 1;
  document.querySelectorAll('.part-btn').forEach(btn => {
    if (parseInt(btn.getAttribute('data-part')) === partNumber) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderHadithLibrary();
}

function filterHadithCategory(category, btnEl) {
  state.hadith.category = category;
  state.hadith.page = 1;
  document.querySelectorAll('.hadith-filter-chip').forEach(el => el.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderHadithLibrary();
}

function searchHadith(query) {
  state.hadith.searchQuery = query;
  state.hadith.page = 1;
  renderHadithLibrary();
}

function changeHadithPage(newPage) {
  if (newPage < 1) return;
  state.hadith.page = newPage;
  renderHadithLibrary();
  window.scrollTo({ top: 380, behavior: 'smooth' });
}

function copyHadithText(id) {
  const h = window.HADITH_DATABASE.find(item => item.id === id);
  if (!h) return;
  const text = `${h.arabic}\n\nترجمہ: ${h.urdu}\n\nحوالہ: ${h.collection}، حدیث نمبر: ${h.hadithNumber}\nدرجہ: ${h.grade}\nماخذ: ${h.sourceUrl}\n---\nراہِ دینِ اسلام | Rah-e-Deen-Islam`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('حدیثِ مبارک کا متن اور مکمل حوالہ کاپی ہو گیا!');
  });
}

function shareHadith(id) {
  const h = window.HADITH_DATABASE.find(item => item.id === id);
  if (!h) return;
  if (navigator.share) {
    navigator.share({
      title: `حدیثِ مبارک #${h.hadithNumber} - راہِ دینِ اسلام`,
      text: `${h.urdu} (${h.collection})`,
      url: window.location.href
    }).catch(() => {});
  } else {
    copyHadithText(id);
  }
}

// ==========================================
// Module: Quran Recitation & 10 Surahs
// ==========================================
function renderQuranSection() {
  const container = document.getElementById('quran-surahs-container');
  if (!container || !window.QURAN_SURAHS) return;

  container.innerHTML = window.QURAN_SURAHS.map(s => `
    <div class="surah-card card-crest">
      <div class="surah-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="surah-number">${s.number}</div>
          <div>
            <h3 class="arabic-text" style="font-size:1.6rem; color:var(--emerald-900); margin:0;">${s.nameArabic}</h3>
            <p style="font-size:0.9rem; color:var(--text-muted); font-weight:600;">${s.nameUrdu} • ${s.nameEn} (${s.revelation}، آیات: ${s.versesCount}، پارہ: ${s.juz})</p>
          </div>
        </div>
        <span class="crescent-badge">${s.category}</span>
      </div>

      <div style="background:var(--ivory-100); border-right:4px solid var(--gold-500); padding:16px; border-radius:8px; margin:14px 0;">
        <div class="arabic-text" style="font-size:1.4rem; text-align:center; color:var(--emerald-900);">${s.bismillahSample}</div>
        <p class="urdu-text" style="text-align:center; font-size:1rem; color:var(--text-dark); margin-top:8px;">${s.translationUrdu}</p>
      </div>

      <div style="margin: 14px 0;">
        <div style="font-weight:700; color:var(--emerald-900); font-size:0.95rem; margin-bottom:4px;">🎯 سورت کا مرکزی موضوع:</div>
        <p class="urdu-text" style="font-size:0.95rem;">${s.theme}</p>
      </div>

      <div class="hadith-section-box">
        <div class="hadith-section-title">✨ مستند سنت سے فضیلت و حیثیت</div>
        <p class="urdu-text" style="font-size:0.95rem; color:var(--text-dark);">${s.authenticVirtues}</p>
        <div style="margin-top:6px; font-size:0.85rem; color:var(--gold-600); font-weight:600;">📌 علمی نکتہ: ${s.sunnahDistinction}</div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
        <button class="btn btn-sm btn-outline-gold" onclick="playSurahAudioSample('${s.nameArabic}')">🔊 تلاوت سنیں</button>
        <a href="${s.quranUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-gold">Quran.com پر مکمل سورہ پڑھیں ↗</a>
      </div>
    </div>
  `).join('');
}

function playSurahAudioSample(surahName) {
  showToast(`سورۃ ${surahName} کی تلاوت کا صفحہ Quran.com پر کھولا جا رہا ہے...`);
}

// ==========================================
// Module: Islamic Q&A Section
// ==========================================
function renderQASection() {
  const container = document.getElementById('qa-accordion-container');
  if (!container || !window.QA_DATABASE) return;

  let items = window.QA_DATABASE;
  if (state.qa.filter !== 'all') {
    items = items.filter(q => q.categoryKey === state.qa.filter);
  }
  if (state.qa.searchQuery) {
    const q = state.qa.searchQuery.toLowerCase();
    items = items.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.shortAnswer.toLowerCase().includes(q) ||
      item.detailedExplanation.toLowerCase().includes(q)
    );
  }

  container.innerHTML = items.map(q => `
    <div class="qa-card" id="qa-card-${q.id}">
      <div class="qa-header" onclick="toggleQACard(${q.id})">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="crescent-badge">${q.category}</span>
          ${q.isDisputed ? '<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:700;">فقہی اختلاف</span>' : ''}
          <h3>${q.title}</h3>
        </div>
        <div class="qa-toggle-icon">▼</div>
      </div>

      <div class="qa-body">
        <!-- 1. مختصر جواب -->
        <div class="qa-block qa-block-short">
          <div style="font-weight:700; color:var(--gold-600); margin-bottom:4px;">📌 مختصر جواب:</div>
          <p class="urdu-text">${q.shortAnswer}</p>
        </div>

        <!-- 2. تفصیلی وضاحت -->
        <div class="qa-block" style="background:var(--ivory-100);">
          <div style="font-weight:700; color:var(--emerald-900); margin-bottom:4px;">📖 تفصیلی وضاحت:</div>
          <p class="urdu-text">${q.detailedExplanation}</p>
        </div>

        <!-- 3. قرآن و حدیث کے دلائل -->
        <div class="qa-block qa-block-evidence">
          <div style="font-weight:700; color:var(--emerald-800); margin-bottom:6px;">📜 قرآن و سنت کے دلائل:</div>
          ${q.evidences.map(e => `
            <div style="margin-bottom:8px;">
              <div class="arabic-text" style="font-size:1.2rem;">${e.text}</div>
              <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">(حوالہ: ${e.ref})</div>
            </div>
          `).join('')}
        </div>

        <!-- 4. علماء کی وضاحت -->
        <div class="qa-block qa-block-scholars">
          <div style="font-weight:700; color:#334155; margin-bottom:6px;">⚖️ فقہی مذاہب و علماء کی وضاحت:</div>
          ${q.scholarlyPositions.map(sp => `
            <div style="margin-bottom:6px;">
              <strong>${sp.school}:</strong> ${sp.view}
            </div>
          `).join('')}
        </div>

        <!-- 5. راجح رائے / عملی رہنمائی -->
        <div class="qa-block qa-block-rajih">
          <div style="font-weight:700; color:var(--emerald-800); font-size:1.05rem; margin-bottom:6px;">✨ راجح رائے / عملی رہنمائی:</div>
          <p class="urdu-text" style="font-weight:600;">${q.rajihGuidance}</p>
        </div>

        <!-- 6. حوالہ جات -->
        <div style="margin-top:14px; font-size:0.88rem; color:var(--text-muted);">
          <strong>حوالہ جات و مصادر:</strong>
          ${q.references.map(r => `<a href="${r.url}" target="_blank" rel="noopener" style="color:var(--emerald-700); margin-right:10px;">${r.name} ↗</a>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function toggleQACard(id) {
  const card = document.getElementById(`qa-card-${id}`);
  if (card) {
    card.classList.toggle('open');
  }
}

function filterQACategory(categoryKey, btnEl) {
  state.qa.filter = categoryKey;
  document.querySelectorAll('.qa-filter-chip').forEach(el => el.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderQASection();
}

function searchQA(query) {
  state.qa.searchQuery = query;
  renderQASection();
}

// ==========================================
// Module: Fiqh Differences Section
// ==========================================
function renderFiqhDifferencesSection() {
  const container = document.getElementById('fiqh-differences-container');
  if (!container || !window.QA_DATABASE) return;

  const disputedItems = window.QA_DATABASE.filter(item => item.isDisputed);
  container.innerHTML = disputedItems.map(item => `
    <div class="fiqh-differences-card card-crest">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span class="crescent-badge">مسئلہ #${item.id} • ${item.category}</span>
        <span style="font-size:0.85rem; color:var(--gold-600); font-weight:700;">فروعی اجتہادی اختلاف</span>
      </div>

      <h3 style="font-size:1.45rem; color:var(--emerald-900); margin:12px 0 8px;">${item.title}</h3>
      <p class="urdu-text" style="color:var(--text-dark); margin-bottom:16px;">${item.detailedExplanation}</p>

      <div style="font-weight:700; color:var(--emerald-900); font-size:1rem; margin-bottom:8px;">مختلف معتبر فقہی مکاتبِ فکر کا موقف اور دلائل:</div>
      
      <div class="fiqh-schools-grid">
        ${item.scholarlyPositions.map(sp => `
          <div class="fiqh-school-box">
            <div class="fiqh-school-title">
              <span>${sp.school}</span>
              <span style="font-size:0.8rem; color:var(--gold-600);">مستند موقف</span>
            </div>
            <p class="urdu-text" style="font-size:0.95rem;">${sp.view}</p>
          </div>
        `).join('')}
      </div>

      <div class="fiqh-conclusion-box">
        <div class="fiqh-conclusion-title">🌟 راجح رائے اور مسلمانوں کے لیے عملی رہنمائی:</div>
        <p class="urdu-text" style="font-size:1.02rem;">${item.rajihGuidance}</p>
      </div>
    </div>
  `).join('');
}

// ==========================================
// Module: Durood Sharif Library
// ==========================================
// ==========================================
// Module: Durood Sharif Library (معجزۂ درود پاک 🤍)
// ==========================================
const duroodCounters = {};
const duroodTargets = {};

function renderDuroodSection() {
  const container = document.getElementById('durood-cards-container');
  if (!container || !window.DUROOD_DATABASE) return;

  let items = window.DUROOD_DATABASE;

  // Filter by category
  if (state.durood && state.durood.category && state.durood.category !== 'all') {
    items = items.filter(d => d.category === state.durood.category);
  }

  // Filter by search query
  if (state.durood && state.durood.searchQuery) {
    const q = state.durood.searchQuery.toLowerCase().trim();
    items = items.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.arabic.includes(q) ||
      d.urdu.toLowerCase().includes(q) ||
      (d.source && d.source.toLowerCase().includes(q))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:36px; color:var(--text-muted);">
        <p style="font-size:1.1rem; margin:0;">کوئی درود شریف نہیں ملا۔ براہِ کرم مختلف الفاظ سے تلاش کریں۔</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(d => {
    const count = duroodCounters[d.id] || 0;
    const target = duroodTargets[d.id] || 33;
    const isCompleted = count >= target;

    return `
      <div class="card card-crest" style="margin-bottom:28px;">
        <div class="card-header" style="flex-wrap:wrap; gap:10px;">
          <h3 class="card-title" style="font-size:1.35rem; color:var(--emerald-900);">${d.title}</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="crescent-badge">${d.category}</span>
            <span style="background:var(--emerald-100); color:var(--emerald-900); border:1px solid var(--emerald-300); padding:3px 10px; border-radius:12px; font-size:0.82rem; font-weight:700;">
              ${d.authenticityGrade}
            </span>
          </div>
        </div>

        ${d.classificationNote ? `
          <div style="background:${d.category.includes('معروف') ? '#fffbeb' : 'var(--gold-50)'}; border-right:4px solid ${d.category.includes('معروف') ? '#f59e0b' : 'var(--gold-500)'}; padding:12px 16px; border-radius:6px; margin-bottom:14px; font-size:0.92rem; color:var(--text-dark); line-height:1.9;">
            ${d.classificationNote}
          </div>
        ` : ''}

        <!-- Arabic Text Box -->
        <div class="arabic-text" dir="rtl" style="background:var(--ivory-100); border-right:4px solid var(--gold-500); padding:22px; border-radius:8px; margin-bottom:16px; text-align:center; font-size:1.55rem; line-height:2.4; color:var(--emerald-950);">
          ${d.arabic}
        </div>

        <!-- Urdu Translation -->
        <div class="urdu-text" dir="rtl" style="font-size:1.08rem; line-height:2.2; margin-bottom:14px; color:var(--text-dark); background:#ffffff; padding:12px 16px; border-radius:8px; border:1px solid var(--ivory-300);">
          <strong style="color:var(--emerald-900);">سلیس اردو ترجمہ:</strong> ${d.urdu}
        </div>

        <!-- Hadith / Scholar Background Box -->
        <div class="hadith-section-box">
          <div class="hadith-section-title">📖 علمی تشریح و پس منظر</div>
          <p class="urdu-text" style="font-size:0.96rem; margin-bottom:8px;">${d.explanation}</p>
          <div style="font-size:0.9rem; color:var(--emerald-800); margin-top:8px; font-weight:700;">✨ فضیلت و ثواب: ${d.virtue}</div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;"><strong>ماخذ و سند:</strong> ${d.source}</div>
        </div>

        <!-- Interactive Recitation Counter (تسبیح کاؤنٹر) -->
        <div style="background:var(--ivory-50); border:1.5px solid var(--gold-400); border-radius:10px; padding:16px 20px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.3rem;">📿</span>
              <strong style="color:var(--emerald-900); font-size:1rem;">تسبیح و ورد کاؤنٹر:</strong>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.88rem; color:var(--text-muted);">ہدف منتخب کریں:</span>
              <button type="button" class="btn btn-sm ${target === 10 ? 'btn-gold' : 'btn-outline-gold'}" style="padding:2px 8px; font-size:0.8rem;" onclick="setDuroodTarget(${d.id}, 10)">۱۰</button>
              <button type="button" class="btn btn-sm ${target === 33 ? 'btn-gold' : 'btn-outline-gold'}" style="padding:2px 8px; font-size:0.8rem;" onclick="setDuroodTarget(${d.id}, 33)">۳۳</button>
              <button type="button" class="btn btn-sm ${target === 100 ? 'btn-gold' : 'btn-outline-gold'}" style="padding:2px 8px; font-size:0.8rem;" onclick="setDuroodTarget(${d.id}, 100)">۱۰۰</button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
            <div style="font-size:1.15rem; font-family:var(--font-ui); font-weight:700; color:var(--emerald-900);">
              تعداد: <span id="durood-count-${d.id}" style="color:${isCompleted ? '#059669' : 'var(--emerald-950)'}; font-size:1.6rem;">${count}</span> / <span id="durood-target-${d.id}">${target}</span>
              ${isCompleted ? ' <span style="color:#059669; font-size:0.95rem;">✅ ہدف مکمل! ماشاء اللہ</span>' : ''}
            </div>

            <div style="display:flex; gap:10px;">
              <button type="button" class="btn btn-sm btn-gold" style="font-weight:700; padding:8px 18px;" onclick="incrementDuroodCounter(${d.id})">➕ ۱ صلوٰۃ پڑھیں</button>
              <button type="button" class="btn btn-sm btn-outline-gold" style="padding:8px 12px;" onclick="resetDuroodCounter(${d.id})">🔄 صفر کریں</button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-outline-gold" onclick="copyDuroodArabic(\`${d.arabic.replace(/`/g, '\\`')}\`)">📋 صرف عربی متن کاپی کریں</button>
          <button type="button" class="btn btn-sm btn-emerald" onclick="copyDuroodText('${d.title.replace(/'/g, "\\'")}', \`${d.arabic.replace(/`/g, '\\`')}\`, \`${d.urdu.replace(/`/g, '\\`')}\`, '${d.source.replace(/'/g, "\\'")}')">📋 مکمل مع ترجمہ کاپی کریں</button>
          ${d.sourceUrl ? `<a href="${d.sourceUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-gold">مستند ماخذ ↗</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function searchDurood(query) {
  if (!state.durood) state.durood = { category: 'all', searchQuery: '' };
  state.durood.searchQuery = query;
  renderDuroodSection();
}

function filterDuroodCategory(cat, btnEl) {
  if (!state.durood) state.durood = { category: 'all', searchQuery: '' };
  state.durood.category = cat;
  document.querySelectorAll('.durood-filter-chip').forEach(el => el.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderDuroodSection();
}

function incrementDuroodCounter(id) {
  duroodCounters[id] = (duroodCounters[id] || 0) + 1;
  const target = duroodTargets[id] || 33;
  const count = duroodCounters[id];
  const countEl = document.getElementById(`durood-count-${id}`);
  if (countEl) {
    countEl.textContent = count;
    if (count >= target) {
      countEl.style.color = '#059669';
      showToast(`ماشاء اللہ! آپ نے ${target} مرتبہ درود شریف مکمل کر لیا 🤍`);
    }
  }
}

function resetDuroodCounter(id) {
  duroodCounters[id] = 0;
  const countEl = document.getElementById(`durood-count-${id}`);
  if (countEl) {
    countEl.textContent = '0';
    countEl.style.color = 'var(--emerald-950)';
  }
  showToast('کاؤنٹر صفر کر دیا گیا');
}

function setDuroodTarget(id, target) {
  duroodTargets[id] = target;
  renderDuroodSection();
  showToast(`ہدف ${target} مقرر کر دیا گیا`);
}

function copyDuroodArabic(ar) {
  navigator.clipboard.writeText(ar).then(() => {
    showToast('عربی درود شریف کاپی ہو گیا! 📋');
  });
}

function copyDuroodText(title, ar, ur, source) {
  const text = `${title}\n\n${ar}\n\nاردو ترجمہ:\n${ur}\n\nماخذ: ${source || ''}\n---\nراہِ دینِ اسلام (Rah-e-Deen-Islam)`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('درود شریف مع اردو ترجمہ کاپی ہو گیا!');
  });
}

// ==========================================
// Module: Wudu Guide & Checklist
// ==========================================
function renderWuduSection() {
  const stepsContainer = document.getElementById('wudu-steps-container');
  const faraizContainer = document.getElementById('wudu-faraiz-container');
  const checklistContainer = document.getElementById('wudu-checklist-container');

  if (stepsContainer && window.WUDU_STEPS) {
    stepsContainer.innerHTML = window.WUDU_STEPS.map(s => `
      <div class="wudu-step-card">
        <div class="wudu-step-badge">${s.step}</div>
        <div class="wudu-step-content">
          <div class="wudu-step-header">
            <h3 style="font-size:1.25rem; color:var(--emerald-900); font-weight:700;">${s.title}</h3>
            <span class="wudu-type-tag ${s.isFard ? 'wudu-type-fard' : 'wudu-type-sunnah'}">${s.type}</span>
          </div>

          ${s.arabicDua ? `<div class="arabic-text" style="font-size:1.35rem; color:var(--emerald-800); margin-bottom:8px;">${s.arabicDua}</div>` : ''}

          <p class="urdu-text" style="font-size:1rem; color:var(--text-dark); margin-bottom:8px;">${s.description}</p>
          
          <div style="background:var(--ivory-100); padding:10px 14px; border-radius:6px; font-size:0.88rem; margin-top:8px;">
            <div style="font-weight:700; color:var(--emerald-800);">حدیث کا ثبوت:</div>
            <p class="urdu-text" style="margin:0;">${s.hadithProof}</p>
          </div>

          <div style="font-size:0.84rem; color:var(--gold-600); margin-top:6px; font-weight:600;">
            فقہی نکتہ: ${s.fiqhNote}
          </div>
        </div>
      </div>
    `).join('');
  }

  if (faraizContainer && window.WUDU_FARAIZ) {
    faraizContainer.innerHTML = `
      <div class="card" style="background:var(--gold-50); border:1.5px solid var(--gold-400);">
        <h3 style="color:var(--emerald-900); margin-bottom:12px; font-size:1.3rem;">قرآن مجید کے مطابق وضو کے چار فرائض (سورۃ المائدہ: ۶)</h3>
        <ul style="list-style:none; padding:0;">
          ${window.WUDU_FARAIZ.map(f => `
            <li style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px dashed rgba(212,175,55,0.4);">
              <span style="width:24px; height:24px; border-radius:50%; background:var(--emerald-800); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700;">${f.id}</span>
              <span class="urdu-text" style="font-weight:600;">${f.name}</span>
            </li>
          `).join('')}
        </ul>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:10px;">نوٹ: ان چار میں سے اگر ایک بال برابر جگہ بھی خشک رہ جائے تو وضو نہیں ہوتا اور نماز باطل ہو جاتی ہے۔</p>
      </div>
    `;
  }

  if (checklistContainer && window.WUDU_STEPS) {
    checklistContainer.innerHTML = window.WUDU_STEPS.map((s, idx) => `
      <label class="checklist-item">
        <input type="checkbox" class="checklist-checkbox" id="wudu-check-${idx}" onchange="toggleWuduCheck(${idx})">
        <span class="urdu-text" style="font-size:0.98rem;">مرحلہ ${s.step}: ${s.title}</span>
      </label>
    `).join('');
  }
}

function toggleWuduCheck(idx) {
  state.checklist[idx] = !state.checklist[idx];
}

function printWuduGuide() {
  window.print();
}

// ==========================================
// Module: Prayer Times Page & Dashboard
// ==========================================
function renderPrayerTimesPage() {
  const citySelect = document.getElementById('prayer-page-city-select');
  if (citySelect) {
    citySelect.value = state.prayer.city;
    citySelect.onchange = async (e) => {
      state.prayer.city = e.target.value;
      await updatePrayerDisplay();
    };
  }

  const schoolSelect = document.getElementById('prayer-page-school-select');
  if (schoolSelect) {
    schoolSelect.value = state.prayer.school;
    schoolSelect.onchange = async (e) => {
      state.prayer.school = parseInt(e.target.value, 10);
      await updatePrayerDisplay();
    };
  }

  if (window.prayerService && window.prayerService.currentTimings) {
    renderPrayerTimesDashboard(window.prayerService.currentTimings);
  }
}

function renderPrayerTimesDashboard(tData) {
  const container = document.getElementById('prayer-page-dashboard');
  if (!container || !tData) return;

  const t = tData.timings;
  const t12 = tData.timings12 || {};
  const nextInfo = window.prayerService.getNextPrayer(t);
  const activeKey = nextInfo?.currentActive?.key;
  const nextKey = nextInfo?.next?.key;

  // 1. Core Farz Prayers & Sunrise
  const fardCards = [
    { key: 'Fajr', nameUrdu: 'فجر', nameAr: 'الفجر', type: 'فرض', typeClass: 'badge-fard', time: t12.Fajr || t.Fajr, icon: '🌅', desc: 'صبح صادق سے طلوعِ آفتاب تک (۲ رکعت سنتِ مؤکدہ + ۲ رکعت فرض)' },
    { key: 'Sunrise', nameUrdu: 'طلوعِ آفتاب', nameAr: 'الشروق', type: 'طلوع', typeClass: 'badge-sun', time: t12.Sunrise || t.Sunrise, icon: '☀️', desc: 'سورج کا افق سے نکلنا (طلوع کے وقت ۱۵ منٹ تک نماز مکروہ ہے)' },
    { key: 'Dhuhr', nameUrdu: 'ظہر', nameAr: 'الظهر', type: 'فرض', typeClass: 'badge-fard', time: t12.Dhuhr || t.Dhuhr, icon: '🌤️', desc: 'زوالِ آفتاب کے فوراً بعد سے عصر کے وقت تک (۴ رکعت سنت + ۴ فرض + ۲ سنت)' },
    { key: 'Asr', nameUrdu: 'عصر', nameAr: 'العصر', type: 'فرض', typeClass: 'badge-fard', time: t12.Asr || t.Asr, icon: '⛅', desc: `${tData.school === 1 ? 'مثلین معیار (فقہ حنفی)' : 'مثلِ اول معیار (شافعی/جمہور)'} تا غروبِ آفتاب (۴ رکعت فرض)` },
    { key: 'Maghrib', nameUrdu: 'مغرب', nameAr: 'المغرب', type: 'فرض', typeClass: 'badge-fard', time: t12.Maghrib || t.Maghrib, icon: '🌇', desc: 'غروبِ آفتاب سے شفقِ احمر کے غائب ہونے تک (۳ رکعت فرض + ۲ سنت)' },
    { key: 'Isha', nameUrdu: 'عشاء', nameAr: 'العشاء', type: 'فرض', typeClass: 'badge-fard', time: t12.Isha || t.Isha, icon: '🌙', desc: 'شفق کے اختتام سے صبح صادق تک (۴ رکعت فرض + ۲ سنت + ۳ وتر واجب)' }
  ];

  // 2. Sunnah & Nafl Worship Timings (اشراق، چاشت، اوابین، تہجد)
  const naflCards = [
    {
      key: 'Ishraq',
      nameUrdu: 'اشراق',
      nameAr: 'صلاة الإشراق',
      type: 'نفل و مسنون',
      typeClass: 'badge-nafl',
      time: t12.Ishraq || t.Ishraq,
      icon: '✨',
      window: tData.extra ? tData.extra.ishraqWindow : `${t12.Ishraq} تا ایک گھنٹہ بعد`,
      desc: 'طلوعِ آفتاب کے ۱۵ منٹ بعد (سورج ایک نیزہ بلند ہونے پر) تا قبلِ چاشت۔',
      hadith: 'حج و عمرہ کا کامل ثواب: جس نے فجر باجماعت پڑھی پھر طلوع تک ذکر کیا اور ۲ رکعتیں پڑھیں (ترمذی: 586)'
    },
    {
      key: 'Chasht',
      nameUrdu: 'چاشت (صلاۃ الضحیٰ)',
      nameAr: 'صلاة الضحى',
      type: 'نفل و مسنون',
      typeClass: 'badge-nafl',
      time: t12.Chasht || t.Chasht,
      icon: '☀️',
      window: tData.extra ? tData.extra.chashtWindow : `${t12.Chasht} تا قبلِ زوال`,
      desc: 'دن چڑھنے (دھوپ تیز ہونے) سے لے کر نصف النہار (زوال) سے پہلے تک (۲ تا ۸ رکعات)۔',
      hadith: 'بدن کے ۳۶۰ جوڑوں کا صدقہ: چاشت کی دو رکعتیں انسان کے تمام جوڑوں کے صدقے کے لیے کافی ہیں (مسلم: 720)'
    },
    {
      key: 'Awwabin',
      nameUrdu: 'اوابین',
      nameAr: 'صلاة الأوابين',
      type: 'نفل و مسنون',
      typeClass: 'badge-nafl',
      time: t12.Awwabin || t.Awwabin,
      icon: '🌿',
      window: tData.extra ? tData.extra.awwabinWindow : `${t12.Awwabin} تا عشاء`,
      desc: 'مغرب کے فرض اور مسنون رکعات کے فوراً بعد عشاء کی اذان سے قبل (۶ تا ۲۰ رکعات)۔',
      hadith: 'رجوع کرنے والوں کی نماز: مغرب کے بعد ۶ رکعتیں پڑھنے والے کو ۱۲ سال کی نفلی عبادت کا ثواب ملتا ہے (ترمذی: 435)'
    },
    {
      key: 'Tahajjud',
      nameUrdu: 'تہجد و قیام اللیل',
      nameAr: 'صلاة التهجد',
      type: 'سنتِ مؤکدہ و نفل',
      typeClass: 'badge-nafl',
      time: t12.Tahajjud || t.Tahajjud,
      icon: '🌌',
      window: tData.extra ? tData.extra.tahajjudWindow : `${t12.Tahajjud} تا صبح صادق`,
      desc: 'رات کی آخری تہائی (سحر کے وقت) صبح صادق سے قبل نیند سے بیدار ہو کر (۲ تا ۱۲ رکعات)۔',
      hadith: 'افضل ترین نفلی نماز: فرض نمازوں کے بعد سب سے افضل نماز رات کی نماز (تہجد) ہے (مسلم: 1163)'
    }
  ];

  container.innerHTML = `
    <!-- Top Summary Banner -->
    <div style="background:linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-850) 100%); color:#fff; border-radius:var(--border-radius-md); padding:24px; margin-bottom:28px; border:2px solid var(--gold-500); box-shadow:var(--shadow-md);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; border-bottom:1px solid rgba(212,175,55,0.3); padding-bottom:14px; margin-bottom:16px;">
        <div>
          <div style="font-size:1.45rem; font-weight:700; color:var(--gold-400);">
            📍 ${tData.city.nameUrdu} (${tData.city.nameEn})، ${tData.city.province} — پاکستان
          </div>
          <div style="font-size:0.92rem; color:var(--ivory-200); margin-top:4px;">
            جغرافیائی نقاط: عرض بلد ${tData.city.lat}° N، طول بلد ${tData.city.lng}° E • ٹائم زون: <strong>${tData.timeZone} (PKT - UTC+5)</strong>
          </div>
        </div>
        <div>
          <span style="background:${tData.status === 'live_api' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(212, 175, 55, 0.25)'}; border:1px solid ${tData.status === 'live_api' ? '#10b981' : 'var(--gold-400)'}; color:${tData.status === 'live_api' ? '#a7f3d0' : 'var(--gold-300)'}; padding:6px 14px; border-radius:20px; font-size:0.85rem; font-weight:700;">
            ${tData.statusUrdu}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; font-size:0.92rem;">
        <div>
          <strong style="color:var(--gold-300);">عیسوی تاریخ:</strong>
          <div>${tData.dateGregorian}</div>
        </div>
        <div>
          <strong style="color:var(--gold-300);">ہجری تاریخ:</strong>
          <div>${tData.dateHijri}</div>
        </div>
        <div>
          <strong style="color:var(--gold-300);">آخری خودکار اپ ڈیٹ:</strong>
          <div>${tData.lastUpdated}</div>
        </div>
        <div>
          <strong style="color:var(--gold-300);">آئندہ وقت و لائیو کاؤنٹ ڈاؤن:</strong>
          <div style="color:#fef08a; font-weight:700; font-size:1.02rem;" id="page-prayer-countdown">
            ${nextInfo ? `${nextInfo.next.nameUrdu} (${nextInfo.countdownUrdu} باقی) ⏳` : '--'}
          </div>
        </div>
      </div>
    </div>

    <!-- Section A: 5 Fard Prayers + Sunrise -->
    <div style="margin-bottom:32px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h3 style="font-size:1.35rem; color:var(--emerald-900); margin:0; display:flex; align-items:center; gap:8px;">
          <span>🕌</span>
          <span>پنج وقتہ فرض نمازیں و طلوعِ آفتاب (12 گھنٹے کا فارمیٹ AM/PM)</span>
        </h3>
        <span style="font-size:0.85rem; color:var(--gold-600); font-weight:700;">جامعہ بنوری ٹاؤن کراچی کا معیار</span>
      </div>

      <div class="cards-grid" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px;">
        ${fardCards.map(p => {
          const isActive = p.key === activeKey;
          const isNext = p.key === nextKey;
          return `
            <div class="card prayer-card-full ${isActive ? 'active-prayer-card' : ''}" data-prayer="${p.key}" style="border:2px solid ${isActive ? 'var(--gold-500)' : 'var(--ivory-300)'}; background:${isActive ? 'var(--gold-50)' : '#ffffff'}; position:relative;">
              <div style="position:absolute; top:12px; left:12px; display:flex; gap:6px;">
                <span class="${p.typeClass}" style="padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700; ${p.type === 'فرض' ? 'background:rgba(6,78,59,0.12); color:var(--emerald-800);' : 'background:rgba(245,158,11,0.18); color:#92400e;'}">${p.type}</span>
                ${isActive ? '<span style="background:var(--emerald-800); color:var(--gold-300); padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">جاری وقت 🟢</span>' : ''}
                ${isNext ? `<span style="background:var(--gold-500); color:var(--emerald-950); padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">آئندہ ⏳ <span id="card-countdown-digits">${nextInfo ? nextInfo.countdownFormatted : ''}</span></span>` : ''}
              </div>

              <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                <span style="font-size:1.8rem;">${p.icon}</span>
                <div>
                  <h4 style="font-size:1.35rem; color:var(--emerald-900); margin:0;">${p.nameUrdu}</h4>
                  <span class="arabic-text" style="font-size:1.05rem; color:var(--gold-600);">${p.nameAr}</span>
                </div>
              </div>

              <div style="font-family:var(--font-ui); font-size:2.1rem; font-weight:700; color:var(--emerald-950); margin:8px 0; letter-spacing:0.5px; direction:ltr; text-align:right;">
                ${p.time}
              </div>

              <div style="font-size:0.86rem; color:var(--text-muted); border-top:1px dashed var(--ivory-200); padding-top:8px;">
                ${p.desc}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Section B: 4 Masnoon Nafl Worship Timings (اشراق، چاشت، اوابین، تہجد) -->
    <div style="margin-bottom:32px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <h3 style="font-size:1.35rem; color:var(--emerald-900); margin:0; display:flex; align-items:center; gap:8px;">
          <span>✨</span>
          <span>مسنون و مستحب نوافل کے اوقات (اشراق، چاشت، اوابین، تہجد)</span>
        </h3>
        <span style="font-size:0.85rem; color:var(--emerald-800); font-weight:700;">پاکستان ٹائم زون (Asia/Karachi) کے مطابق حسابی اوقات</span>
      </div>

      <div class="cards-grid" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px;">
        ${naflCards.map(n => {
          const isActive = n.key === activeKey;
          const isNext = n.key === nextKey;
          return `
            <div class="card prayer-card-full ${isActive ? 'active-prayer-card' : ''}" data-prayer="${n.key}" style="border:2px solid ${isActive ? 'var(--gold-500)' : 'rgba(212,175,55,0.4)'}; background:${isActive ? 'var(--gold-50)' : 'linear-gradient(180deg, #ffffff 0%, var(--ivory-50) 100%)'}; position:relative;">
              <div style="position:absolute; top:12px; left:12px; display:flex; gap:6px;">
                <span style="background:rgba(212,175,55,0.25); color:#854d0e; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">${n.type}</span>
                ${isActive ? '<span style="background:var(--emerald-800); color:var(--gold-300); padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">جاری وقت 🟢</span>' : ''}
                ${isNext ? `<span style="background:var(--gold-500); color:var(--emerald-950); padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">آئندہ ⏳</span>` : ''}
              </div>

              <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                <span style="font-size:1.8rem;">${n.icon}</span>
                <div>
                  <h4 style="font-size:1.3rem; color:var(--emerald-900); margin:0;">${n.nameUrdu}</h4>
                  <span class="arabic-text" style="font-size:1.05rem; color:var(--gold-600);">${n.nameAr}</span>
                </div>
              </div>

              <div style="font-family:var(--font-ui); font-size:2rem; font-weight:700; color:var(--emerald-950); margin:8px 0; letter-spacing:0.5px; direction:ltr; text-align:right;">
                ${n.time}
              </div>

              <div style="background:var(--ivory-100); padding:6px 10px; border-radius:6px; font-size:0.84rem; color:var(--emerald-850); margin-bottom:8px; font-weight:600;">
                ⏱️ مستحب دورانیہ: <strong>${n.window}</strong>
              </div>

              <p class="urdu-text" style="font-size:0.86rem; color:var(--text-dark); margin:0 0 6px;">
                ${n.desc}
              </p>

              <div style="font-size:0.8rem; color:var(--gold-600); border-top:1px dashed rgba(212,175,55,0.3); padding-top:6px; font-weight:600;">
                📖 ${n.hadith}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Section C: Prohibited & Makruh Intervals -->
    ${tData.extra ? `
      <div style="background:var(--ivory-50); border:1.5px solid var(--gold-400); border-radius:var(--border-radius-md); padding:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:18px;">
        <div>
          <div style="font-weight:700; color:#b91c1c;">⚠️ زوال و نصف النہار (نماز مکروہ ہے):</div>
          <div style="font-family:var(--font-ui); font-size:1.25rem; font-weight:700; color:#991b1b; direction:ltr; text-align:right;">${tData.extra.zawalWindow}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">سورج ٹھیک سر پر ہو تو سجدہ و نفل نماز پڑھنا ممنوع ہے</div>
        </div>

        <div>
          <div style="font-weight:700; color:#b91c1c;">⚠️ طلوعِ آفتاب کا ممنوعہ وقت:</div>
          <div style="font-family:var(--font-ui); font-size:1.25rem; font-weight:700; color:#991b1b; direction:ltr; text-align:right;">${t12.Sunrise} تا ${t12.Ishraq}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">طلوع کے وقت ۱۵ منٹ تک نماز پڑھنا مکروہِ تحریمی ہے</div>
        </div>

        <div>
          <div style="font-weight:700; color:var(--emerald-900);">🌙 اسلامی نصف اللیل (منتصف اللیل):</div>
          <div style="font-family:var(--font-ui); font-size:1.25rem; font-weight:700; color:var(--emerald-800); direction:ltr; text-align:right;">${tData.extra.midnight12 || tData.extra.midnight}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">مغرب تا فجر کا درمیانی نقطہ، عشاء اس سے قبل پڑھنا افضل ہے</div>
        </div>
      </div>
    ` : ''}
  `;
}

async function refreshPrayerTimingsManually(btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ تازہ ہو رہا ہے...';
  }

  await updatePrayerDisplay();

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔄 ابھی ریفریش کریں';
    }
    showToast('اوقاتِ نماز کامیابی سے تازہ کر دیے گئے ہیں!');
  }, 400);
}

function openMonthlyTimetableModal() {
  const modal = document.getElementById('monthly-prayer-modal');
  const body = document.getElementById('monthly-timetable-body');
  if (!modal || !body || !window.prayerService) return;

  const timetableData = window.prayerService.calculateMonthlyTimetable(state.prayer.city, state.prayer.school);
  const cityName = timetableData.city.nameUrdu;
  const schoolName = timetableData.school === 1 ? 'حنفی' : 'شافعی/جمہور';
  const monthsUrdu = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
  const monthName = monthsUrdu[timetableData.month - 1];

  document.getElementById('monthly-modal-title').textContent = `${cityName} کے لیے ماہانہ اوقاتِ نماز — ${monthName} ${timetableData.year}ء (${schoolName} عصر)`;

  body.innerHTML = `
    <div style="margin-bottom:12px; font-size:0.88rem; color:var(--text-muted); display:flex; justify-content:space-between; flex-wrap:wrap;">
      <span>شہر: <strong>${cityName} (${timetableData.city.nameEn})</strong></span>
      <span>معیار: <strong>جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن، کراچی</strong></span>
      <span>ٹائم زون: <strong>Asia/Karachi (PKT - UTC+5)</strong></span>
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
      <thead>
        <tr style="background:var(--emerald-800); color:#fff; text-align:center;">
          <th style="padding:10px; border:1px solid #ddd;">تاریخ</th>
          <th style="padding:10px; border:1px solid #ddd;">فجر</th>
          <th style="padding:10px; border:1px solid #ddd;">طلوع</th>
          <th style="padding:10px; border:1px solid #ddd;">ظہر</th>
          <th style="padding:10px; border:1px solid #ddd;">عصر (${schoolName})</th>
          <th style="padding:10px; border:1px solid #ddd;">مغرب</th>
          <th style="padding:10px; border:1px solid #ddd;">عشاء</th>
        </tr>
      </thead>
      <tbody>
        ${timetableData.rows.map(r => `
          <tr style="background:${r.day % 2 === 0 ? 'var(--ivory-100)' : '#ffffff'}; text-align:center;">
            <td style="padding:8px; border:1px solid #ddd; font-weight:700;">${r.day} ${monthName}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui); font-weight:600;">${r.Fajr}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui);">${r.Sunrise}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui); font-weight:600;">${r.Dhuhr}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui); font-weight:600; color:var(--emerald-800);">${r.Asr}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui); font-weight:600; color:#b91c1c;">${r.Maghrib}</td>
            <td style="padding:8px; border:1px solid #ddd; font-family:var(--font-ui); font-weight:600;">${r.Isha}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="margin-top:14px; font-size:0.82rem; color:var(--text-muted); text-align:right;">
      * نوٹ: یہ اوقات جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن کراچی کے تسلیم شدہ زاویوں (فجر و عشاء ۱۸ ڈگری) اور فلکیاتی شمسی قوانین کے تحت نکالے گئے ہیں۔ احتیاطاً مقامی مسجد کی اذان سے مطابقت کر لیں۔
    </div>
  `;

  modal.classList.add('open');
}

// ==========================================
// Module: Islamic Calendar (12 Months)
// ==========================================
function renderCalendarSection() {
  const container = document.getElementById('calendar-grid-container');
  if (!container || !window.ISLAMIC_MONTHS) return;

  container.innerHTML = window.ISLAMIC_MONTHS.map(m => `
    <div class="month-card ${m.isSacred ? 'sacred' : ''}">
      <span class="month-badge ${m.isSacred ? 'month-sacred-badge' : 'crescent-badge'}">
        ${m.isSacred ? 'حرمت والا مہینہ' : `مہینہ #${m.number}`}
      </span>

      <h3 class="arabic-text" style="font-size:1.5rem; color:var(--emerald-900); margin:10px 0 6px;">${m.nameArabic}</h3>
      <div style="font-weight:700; color:var(--gold-600); font-size:0.95rem; margin-bottom:8px;">${m.nameUrdu} • ${m.nameEn}</div>
      <p class="urdu-text" style="font-size:0.92rem; color:var(--text-dark); margin-bottom:12px;">${m.description}</p>

      <div style="border-top:1px dashed rgba(212,175,55,0.4); padding-top:8px;">
        <div style="font-weight:700; color:var(--emerald-900); font-size:0.88rem; margin-bottom:4px;">✨ اہم دینی مواقع:</div>
        ${m.occasions.map(o => `
          <div style="background:var(--ivory-100); padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.85rem;">
            <strong>${o.day} (${o.title}):</strong> ${o.description}
          </div>
        `).join('')}
      </div>

      <div style="font-size:0.82rem; color:var(--text-muted); margin-top:8px;">
        <strong>عملی رہنمائی:</strong> ${m.guidance}
      </div>
    </div>
  `).join('');
}

// ==========================================
// Module: Masnoon Duas Library
// ==========================================
function renderDuasSection(filterCat = 'all') {
  const container = document.getElementById('duas-cards-container');
  if (!container || !window.MASNOON_DUAS) return;

  let items = window.MASNOON_DUAS;
  if (filterCat !== 'all') {
    items = items.filter(d => d.category === filterCat);
  }

  container.innerHTML = items.map(d => `
    <div class="card card-crest" style="margin-bottom:20px;">
      <div class="card-header">
        <h3 class="card-title" style="font-size:1.15rem;">${d.occasion}</h3>
        <span class="crescent-badge">${d.category}</span>
      </div>

      <div class="arabic-text" style="background:var(--ivory-100); border-right:4px solid var(--gold-500); padding:16px; border-radius:8px; margin-bottom:12px; text-align:center;">
        ${d.arabic}
      </div>

      <div class="urdu-text" style="font-size:1rem; margin-bottom:10px;">
        <strong>ترجمہ:</strong> ${d.urdu}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:0.85rem; color:var(--text-muted); border-top:1px solid var(--ivory-200); padding-top:10px;">
        <span><strong>فضیلت:</strong> ${d.virtue}</span>
        <span><strong>حوالہ:</strong> ${d.source}</span>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:12px;">
        <button class="btn btn-sm btn-outline-gold" onclick="copyDuaText('${d.occasion}', \`${d.arabic}\`, \`${d.urdu}\`)">📋 دعا کاپی کریں</button>
      </div>
    </div>
  `).join('');
}

function copyDuaText(occasion, ar, ur) {
  const text = `${occasion}\n\n${ar}\n\nترجمہ: ${ur}\n\n---\nماخذ: راہِ دینِ اسلام (Rah-e-Deen-Islam)`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('مسنون دعا کاپی ہو گئی!');
  });
}

// ==========================================
// Language Switching (Urdu / Arabic)
// ==========================================
function setLanguage(lang) {
  state.currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const titleEl = document.querySelector('.hero-title');
  if (titleEl) {
    if (lang === 'ar') {
      titleEl.innerHTML = 'مرحباً بكم في <span>طريق دين الإسلام</span>';
    } else {
      titleEl.innerHTML = 'خوش آمدید! <span>راہِ دینِ اسلام</span>';
    }
  }

  showToast(lang === 'ar' ? 'تم تحويل اللغة إلى العربية' : 'زبان اردو میں تبدیل کر دی گئی ہے');
}

// ==========================================
// Modal & Toast Helpers
// ==========================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Global functions exposed for HTML inline onclicks
window.navigateTo = navigateTo;
window.setHadithPart = setHadithPart;
window.filterHadithCategory = filterHadithCategory;
window.searchHadith = searchHadith;
window.changeHadithPage = changeHadithPage;
window.copyHadithText = copyHadithText;
window.shareHadith = shareHadith;
window.toggleQACard = toggleQACard;
window.filterQACategory = filterQACategory;
window.searchQA = searchQA;
window.copyDuroodText = copyDuroodText;
window.toggleWuduCheck = toggleWuduCheck;
window.printWuduGuide = printWuduGuide;
window.openMonthlyTimetableModal = openMonthlyTimetableModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.copyDuaText = copyDuaText;
window.renderDuasSection = renderDuasSection;
window.playSurahAudioSample = playSurahAudioSample;
window.refreshPrayerTimingsManually = refreshPrayerTimingsManually;
window.renderPrayerTimesDashboard = renderPrayerTimesDashboard;
