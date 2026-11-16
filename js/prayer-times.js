/**
 * Comprehensive Automatic Prayer & Worship Times Engine for Rah-e-Deen-Islam
 * Default: Pakistan, Asia/Karachi (PKT - UTC+5)
 * Calculation Standard: University of Islamic Sciences, Karachi (Method 1)
 * Configurable Asr: Hanafi (School 1 - shadow 2x) / Shafi'i (School 0 - shadow 1x)
 * 12-Hour AM/PM format for all 10 timings:
 * 1. فجر (Fajr)
 * 2. طلوعِ آفتاب (Sunrise)
 * 3. اشراق (Ishraq - Sunrise + 15m)
 * 4. چاشت (Chasht / Duha - Mid-morning)
 * 5. ظہر (Zuhr / Dhuhr - Solar noon)
 * 6. عصر (Asr - Hanafi default)
 * 7. مغرب (Maghrib - Sunset)
 * 8. اوابین (Awwabin - After Maghrib Sunnah)
 * 9. عشاء (Isha - Karachi 18°)
 * 10. تہجد (Tahajjud - Last third of night)
 */

const PAK_CITIES = {
  vehari: { nameUrdu: 'وہاڑی', nameEn: 'Vehari', province: 'پنجاب', lat: 30.0452, lng: 72.3489 },
  lahore: { nameUrdu: 'لاہور', nameEn: 'Lahore', province: 'پنجاب', lat: 31.5497, lng: 74.3436 },
  islamabad: { nameUrdu: 'اسلام آباد', nameEn: 'Islamabad', province: 'وفاقی دارالحکومت', lat: 33.6844, lng: 73.0479 },
  karachi: { nameUrdu: 'کراچی', nameEn: 'Karachi', province: 'سندھ', lat: 24.8607, lng: 67.0011 },
  multan: { nameUrdu: 'ملتان', nameEn: 'Multan', province: 'پنجاب', lat: 30.1575, lng: 71.5249 },
  faisalabad: { nameUrdu: 'فیصل آباد', nameEn: 'Faisalabad', province: 'پنجاب', lat: 31.4504, lng: 73.1350 },
  rawalpindi: { nameUrdu: 'راولپنڈی', nameEn: 'Rawalpindi', province: 'پنجاب', lat: 33.5651, lng: 73.0169 },
  peshawar: { nameUrdu: 'پشاور', nameEn: 'Peshawar', province: 'خیبر پختونخوا', lat: 34.0151, lng: 71.5249 },
  quetta: { nameUrdu: 'کوئٹہ', nameEn: 'Quetta', province: 'بلوچستان', lat: 30.1798, lng: 66.9750 },
  sialkot: { nameUrdu: 'سیالکوٹ', nameEn: 'Sialkot', province: 'پنجاب', lat: 32.4945, lng: 74.5229 },
  gujranwala: { nameUrdu: 'گوجرانوالہ', nameEn: 'Gujranwala', province: 'پنجاب', lat: 32.1877, lng: 74.1945 },
  bahawalpur: { nameUrdu: 'بہاولپور', nameEn: 'Bahawalpur', province: 'پنجاب', lat: 29.3544, lng: 71.6911 },
  sargodha: { nameUrdu: 'سرگودھا', nameEn: 'Sargodha', province: 'پنجاب', lat: 32.0836, lng: 72.6711 },
  sahiwal: { nameUrdu: 'ساہیوال', nameEn: 'Sahiwal', province: 'پنجاب', lat: 30.6682, lng: 73.1114 },
  dera_ghazi_khan: { nameUrdu: 'ڈیرہ غازی خان', nameEn: 'Dera Ghazi Khan', province: 'پنجاب', lat: 30.0489, lng: 70.6455 },
  hyderabad: { nameUrdu: 'حیدرآباد', nameEn: 'Hyderabad', province: 'سندھ', lat: 25.3960, lng: 68.3578 },
  sukkur: { nameUrdu: 'سکھر', nameEn: 'Sukkur', province: 'سندھ', lat: 27.7052, lng: 68.8574 },
  abbottabad: { nameUrdu: 'ایبٹ آباد', nameEn: 'Abbottabad', province: 'خیبر پختونخوا', lat: 34.1688, lng: 73.2215 },
  muzaffarabad: { nameUrdu: 'مظفر آباد', nameEn: 'Muzaffarabad', province: 'آزاد کشمیر', lat: 34.3700, lng: 73.4708 },
  gilgit: { nameUrdu: 'گلگت', nameEn: 'Gilgit', province: 'گلگت بلتستان', lat: 35.9221, lng: 74.3087 }
};

class PrayerTimeService {
  constructor() {
    this.currentCityKey = 'vehari';
    this.currentSchool = 1; // 1 = Hanafi, 0 = Shafi'i/Standard
    this.currentTimings = null;
    this.lastFetchedDateStr = null;
    this.lastSuccessfulUpdate = null;
    this.listeners = [];
    this.autoRefreshInterval = null;
    this.timeZone = 'Asia/Karachi';
  }

  // Helper to convert 24h format "HH:MM" into clean 12-hour format "h:mm AM/PM"
  format12Hour(timeStr) {
    if (!timeStr || timeStr === '--:--') return '--:--';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  // Get current date & time specifically in Pakistan Time (Asia/Karachi)
  getPakistanDate() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    const dateStrDDMMYYYY = `${day}-${month}-${year}`;

    // Urdu formatted date string
    const monthsUrdu = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
    const monthName = monthsUrdu[parseInt(month, 10) - 1];
    const dateFormattedUrdu = `${parseInt(day, 10)} ${monthName} ${year}ء`;

    // 12-hour formatted time with AM/PM
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    const timeFormatted = `${hour12}:${minute}:${second} ${ampm} (PKT)`;

    return {
      day: parseInt(day, 10),
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      hour: parseInt(hour, 10),
      minute: parseInt(minute, 10),
      second: parseInt(second, 10),
      totalSeconds: parseInt(hour, 10) * 3600 + parseInt(minute, 10) * 60 + parseInt(second, 10),
      dateStrDDMMYYYY,
      dateFormattedUrdu,
      timeFormatted
    };
  }

  // Fetch timings for selected Pakistani city and date
  async fetchTimings(cityKey = this.currentCityKey, school = this.currentSchool) {
    this.currentCityKey = cityKey;
    this.currentSchool = parseInt(school, 10);
    const city = PAK_CITIES[cityKey] || PAK_CITIES.vehari;
    const pktDate = this.getPakistanDate();
    this.lastFetchedDateStr = pktDate.dateStrDDMMYYYY;

    try {
      // Reliable AlAdhan API endpoint with Karachi method (1), city, and school parameter
      const url = `https://api.aladhan.com/v1/timingsByCity/${pktDate.dateStrDDMMYYYY}?city=${encodeURIComponent(city.nameEn)}&country=Pakistan&method=1&school=${this.currentSchool}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data && data.data && data.data.timings) {
        const raw = data.data.timings;
        const hijri = data.data.date.hijri;
        this.lastSuccessfulUpdate = pktDate.timeFormatted;

        this.currentTimings = {
          cityKey,
          city,
          school: this.currentSchool,
          schoolLabel: this.currentSchool === 1 ? 'فقہ حنفی (سایہ دوگنا - مثلین)' : 'شافعی و جمہور (سایہ اکہرا - مثلِ اول)',
          methodName: 'جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن، کراچی (AlAdhan API)',
          status: 'live_api',
          statusUrdu: 'آن لائن تصدیق شدہ لائیو اوقات (AlAdhan API)',
          timeZone: this.timeZone,
          dateGregorian: `${pktDate.dateFormattedUrdu} (${pktDate.dateStrDDMMYYYY})`,
          dateHijri: `${hijri.day} ${hijri.month.ar || hijri.month.en} ${hijri.year}ھ`,
          lastUpdated: pktDate.timeFormatted,
          lastSuccessfulUpdate: this.lastSuccessfulUpdate,
          timings: {
            Fajr: this.cleanTime(raw.Fajr),
            Sunrise: this.cleanTime(raw.Sunrise),
            Dhuhr: this.cleanTime(raw.Dhuhr),
            Asr: this.cleanTime(raw.Asr),
            Maghrib: this.cleanTime(raw.Maghrib),
            Isha: this.cleanTime(raw.Isha),
            Imsak: this.cleanTime(raw.Imsak),
            Midnight: this.cleanTime(raw.Midnight)
          }
        };

        this.calculateExtraTimes();
        this.notifyListeners();
        return this.currentTimings;
      }
      throw new Error('Invalid Data Structure');
    } catch (err) {
      console.warn(`[PrayerService] Live AlAdhan API unavailable (${err.message}). Using Karachi Method Astronomical Engine for ${city.nameUrdu}.`);
      return this.calculateOfflineTimings(city, this.currentSchool, pktDate, cityKey);
    }
  }

  cleanTime(timeStr) {
    return timeStr ? timeStr.split(' ')[0] : '--:--';
  }

  // Calculate all Nafl and Worship Timings:
  // - اشراق (Ishraq): Sunrise + 15 minutes (forbidden sunrise window ends)
  // - چاشت (Chasht / Duha): Mid-morning until Zawal
  // - اوابین (Awwabin): Maghrib + 12 minutes until Isha
  // - تہجد (Tahajjud): Last third of the night (Maghrib to Fajr)
  // - Converts all 10 timings into 12-hour AM/PM format
  calculateExtraTimes() {
    if (!this.currentTimings) return;
    const t = this.currentTimings.timings;

    const parseM = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const formatM = (totalM) => {
      const normalized = (Math.round(totalM) + 1440) % 1440;
      const h = Math.floor(normalized / 60);
      const min = normalized % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    const sunriseM = parseM(t.Sunrise);
    const dhuhrM = parseM(t.Dhuhr);
    const maghribM = parseM(t.Maghrib);
    const fajrM = parseM(t.Fajr);

    // 1. اشراق (Ishraq):
    // Islamic method: 15 to 20 minutes after sunrise when the sun rises a spear's height (رمح)
    // and the prohibited sunrise window ends.
    const ishraqStartM = (sunriseM + 15) % 1440;
    const ishraqEndM = (sunriseM + 60) % 1440;

    // 2. چاشت (Chasht / صلاۃ الضحیٰ):
    // Islamic method: Starts after sun warms up (approx 45% between sunrise & Dhuhr) until Zawal
    const chashtStartM = (sunriseM + Math.round((dhuhrM - sunriseM) * 0.45)) % 1440;
    const zawalStartM = (dhuhrM - 12 + 1440) % 1440;

    // 3. اوابین (Awwabin):
    // Islamic method: Voluntary prayer performed immediately after Maghrib's Fard and Sunnah
    // (approx 10-15 minutes after Maghrib) until Isha.
    const awwabinStartM = (maghribM + 12) % 1440;

    // 4. تہجد (Tahajjud / صلاۃ اللیل):
    // Islamic method: Calculated from Maghrib to Fajr. Preferred time is the last 1/3 of the night.
    const nightMinutes = (fajrM + 1440 - maghribM) % 1440;
    const tahajjudStartM = (maghribM + Math.round(nightMinutes * 2 / 3)) % 1440;
    const midnightM = (maghribM + Math.round(nightMinutes / 2)) % 1440;

    // Store raw 24h
    t.Ishraq = formatM(ishraqStartM);
    t.Chasht = formatM(chashtStartM);
    t.Awwabin = formatM(awwabinStartM);
    t.Tahajjud = formatM(tahajjudStartM);

    // Store 12-hour formatted versions (e.g., عصر 4:01 PM، مغرب 5:38 PM)
    this.currentTimings.timings12 = {
      Fajr: this.format12Hour(t.Fajr),
      Sunrise: this.format12Hour(t.Sunrise),
      Ishraq: this.format12Hour(t.Ishraq),
      Chasht: this.format12Hour(t.Chasht),
      Dhuhr: this.format12Hour(t.Dhuhr),
      Asr: this.format12Hour(t.Asr),
      Maghrib: this.format12Hour(t.Maghrib),
      Awwabin: this.format12Hour(t.Awwabin),
      Isha: this.format12Hour(t.Isha),
      Tahajjud: this.format12Hour(t.Tahajjud)
    };

    // Metadata for worship intervals
    this.currentTimings.extra = {
      ishraqTime12: this.format12Hour(t.Ishraq),
      ishraqWindow: `${this.format12Hour(t.Ishraq)} تا ${this.format12Hour(formatM(ishraqEndM))}`,
      chashtTime12: this.format12Hour(t.Chasht),
      chashtWindow: `${this.format12Hour(t.Chasht)} تا ${this.format12Hour(formatM(zawalStartM))}`,
      awwabinTime12: this.format12Hour(t.Awwabin),
      awwabinWindow: `${this.format12Hour(t.Awwabin)} تا ${this.format12Hour(t.Isha)} (نمازِ عشاء)`,
      tahajjudTime12: this.format12Hour(t.Tahajjud),
      tahajjudWindow: `${this.format12Hour(t.Tahajjud)} تا ${this.format12Hour(t.Fajr)} (صبح صادق)`,
      zawalWindow: `${this.format12Hour(formatM(zawalStartM))} تا ${this.format12Hour(t.Dhuhr)}`,
      midnight12: this.format12Hour(formatM(midnightM))
    };
  }

  // Built-in Precision Solar Astronomical Engine for Pakistan
  // Based on Karachi University of Islamic Sciences specifications:
  // Fajr/Isha angle = 18 degrees, Sunrise/Sunset = 0.833 degrees, Standard Meridian = 75°E (PKT UTC+5)
  calculateOfflineTimings(city, school, pktDate = this.getPakistanDate(), cityKey = null) {
    const activeCityKey = cityKey || Object.keys(PAK_CITIES).find(k => PAK_CITIES[k].nameEn === city?.nameEn) || this.currentCityKey;
    const startOfYear = new Date(pktDate.year, 0, 0);
    const diff = new Date(pktDate.year, pktDate.month - 1, pktDate.day) - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

    const eot = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );

    const declination = 0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);

    const latRad = (city.lat * Math.PI) / 180;
    const solarNoonMinutes = 12 * 60 + 4 * (75 - city.lng) - eot;

    const hourAngle = (angleDeg) => {
      const angleRad = (angleDeg * Math.PI) / 180;
      const cosH = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(declination)) /
                   (Math.cos(latRad) * Math.cos(declination));
      const clamped = Math.max(-1, Math.min(1, cosH));
      return (Math.acos(clamped) * 180 / Math.PI) / 15 * 60;
    };

    const fajrIshaH = hourAngle(-18);
    const sunriseSunsetH = hourAngle(-0.833);

    const asrShadowFactor = school === 1 ? 2 : 1;
    const zenithAngleRad = Math.abs(latRad - declination);
    const asrAltitudeAngleRad = Math.atan(1 / (asrShadowFactor + Math.tan(zenithAngleRad)));
    const cosAsrH = (Math.sin(asrAltitudeAngleRad) - Math.sin(latRad) * Math.sin(declination)) /
                    (Math.cos(latRad) * Math.cos(declination));
    const asrH = (Math.acos(Math.max(-1, Math.min(1, cosAsrH))) * 180 / Math.PI) / 15 * 60;

    const formatMinutes = (m) => {
      const totalM = Math.round(m);
      const h = Math.floor(totalM / 60) % 24;
      const min = totalM % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    const fajrM = solarNoonMinutes - fajrIshaH;
    const sunriseM = solarNoonMinutes - sunriseSunsetH;
    const dhuhrM = solarNoonMinutes;
    const asrM = solarNoonMinutes + asrH;
    const maghribM = solarNoonMinutes + sunriseSunsetH;
    const ishaM = solarNoonMinutes + fajrIshaH;

    this.currentTimings = {
      cityKey: activeCityKey,
      city,
      school,
      schoolLabel: school === 1 ? 'فقہ حنفی (سایہ دوگنا - مثلین)' : 'شافعی و جمہور (سایہ اکہرا - مثلِ اول)',
      methodName: 'جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن، کراچی (فلکیاتی شمسی حسابی نظام برائے پاکستان)',
      status: 'offline_fallback',
      statusUrdu: 'جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن کراچی کے تسلیم شدہ اوقات (آف لائن بیک اپ موڈ)',
      timeZone: this.timeZone,
      dateGregorian: `${pktDate.dateFormattedUrdu} (${pktDate.dateStrDDMMYYYY})`,
      dateHijri: 'حسابی تقویمِ پاکستان',
      lastUpdated: `${pktDate.timeFormatted}`,
      lastSuccessfulUpdate: this.lastSuccessfulUpdate || 'آف لائن بیک اپ فعال',
      timings: {
        Fajr: formatMinutes(fajrM),
        Sunrise: formatMinutes(sunriseM),
        Dhuhr: formatMinutes(dhuhrM),
        Asr: formatMinutes(asrM),
        Maghrib: formatMinutes(maghribM),
        Isha: formatMinutes(ishaM)
      }
    };

    this.calculateExtraTimes();
    this.notifyListeners();
    return this.currentTimings;
  }

  // Calculate solar timings for any specific day in Pakistan
  calculateDaySolarTimings(city, school, day, month, year) {
    const startOfYear = new Date(year, 0, 0);
    const diff = new Date(year, month - 1, day) - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

    const eot = 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );

    const declination = 0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma);

    const latRad = (city.lat * Math.PI) / 180;
    const solarNoonMinutes = 12 * 60 + 4 * (75 - city.lng) - eot;

    const hourAngle = (angleDeg) => {
      const angleRad = (angleDeg * Math.PI) / 180;
      const cosH = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(declination)) /
                   (Math.cos(latRad) * Math.cos(declination));
      const clamped = Math.max(-1, Math.min(1, cosH));
      return (Math.acos(clamped) * 180 / Math.PI) / 15 * 60;
    };

    const fajrIshaH = hourAngle(-18);
    const sunriseSunsetH = hourAngle(-0.833);

    const asrShadowFactor = school === 1 ? 2 : 1;
    const zenithAngleRad = Math.abs(latRad - declination);
    const asrAltitudeAngleRad = Math.atan(1 / (asrShadowFactor + Math.tan(zenithAngleRad)));
    const cosAsrH = (Math.sin(asrAltitudeAngleRad) - Math.sin(latRad) * Math.sin(declination)) /
                    (Math.cos(latRad) * Math.cos(declination));
    const asrH = (Math.acos(Math.max(-1, Math.min(1, cosAsrH))) * 180 / Math.PI) / 15 * 60;

    const formatMinutes = (m) => {
      const totalM = Math.round(m);
      const h = Math.floor(totalM / 60) % 24;
      const min = totalM % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    return {
      day,
      month,
      year,
      Fajr: this.format12Hour(formatMinutes(solarNoonMinutes - fajrIshaH)),
      Sunrise: this.format12Hour(formatMinutes(solarNoonMinutes - sunriseSunsetH)),
      Dhuhr: this.format12Hour(formatMinutes(solarNoonMinutes)),
      Asr: this.format12Hour(formatMinutes(solarNoonMinutes + asrH)),
      Maghrib: this.format12Hour(formatMinutes(solarNoonMinutes + sunriseSunsetH)),
      Isha: this.format12Hour(formatMinutes(solarNoonMinutes + fajrIshaH))
    };
  }

  // Generate authentic calculated monthly timetable for any Pakistani city & month
  calculateMonthlyTimetable(cityKey = this.currentCityKey, school = this.currentSchool, year = null, month = null) {
    const city = PAK_CITIES[cityKey] || PAK_CITIES.vehari;
    const pktDate = this.getPakistanDate();
    const targetYear = year || pktDate.year;
    const targetMonth = month || pktDate.month;

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const rows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      rows.push(this.calculateDaySolarTimings(city, school, d, targetMonth, targetYear));
    }

    return {
      city,
      school,
      year: targetYear,
      month: targetMonth,
      rows
    };
  }

  // Determine current active prayer, next upcoming prayer, and live countdown (hours, minutes, seconds)
  getNextPrayer(timings = this.currentTimings?.timings) {
    if (!timings) return null;

    const pktDate = this.getPakistanDate();
    const currentSec = (pktDate.hour * 3600) + (pktDate.minute * 60) + pktDate.second;

    const t12 = this.currentTimings?.timings12 || {};

    const prayers = [
      { key: 'Tahajjud', nameUrdu: 'تہجد', nameAr: 'صلاة التهجد', type: 'نفل', time: timings.Tahajjud, time12: t12.Tahajjud || this.format12Hour(timings.Tahajjud), icon: '🌌' },
      { key: 'Fajr', nameUrdu: 'فجر', nameAr: 'الفجر', type: 'فرض', time: timings.Fajr, time12: t12.Fajr || this.format12Hour(timings.Fajr), icon: '🌅' },
      { key: 'Sunrise', nameUrdu: 'طلوعِ آفتاب', nameAr: 'الشروق', type: 'طلوع', time: timings.Sunrise, time12: t12.Sunrise || this.format12Hour(timings.Sunrise), icon: '☀️', isSunrise: true },
      { key: 'Ishraq', nameUrdu: 'اشراق', nameAr: 'صلاة الإشراق', type: 'نفل', time: timings.Ishraq, time12: t12.Ishraq || this.format12Hour(timings.Ishraq), icon: '✨' },
      { key: 'Chasht', nameUrdu: 'چاشت', nameAr: 'صلاة الضحى', type: 'نفل', time: timings.Chasht, time12: t12.Chasht || this.format12Hour(timings.Chasht), icon: '☀️' },
      { key: 'Dhuhr', nameUrdu: 'ظہر', nameAr: 'الظهر', type: 'فرض', time: timings.Dhuhr, time12: t12.Dhuhr || this.format12Hour(timings.Dhuhr), icon: '🌤️' },
      { key: 'Asr', nameUrdu: 'عصر', nameAr: 'العصر', type: 'فرض', time: timings.Asr, time12: t12.Asr || this.format12Hour(timings.Asr), icon: '⛅' },
      { key: 'Maghrib', nameUrdu: 'مغرب', nameAr: 'المغرب', type: 'فرض', time: timings.Maghrib, time12: t12.Maghrib || this.format12Hour(timings.Maghrib), icon: '🌇' },
      { key: 'Awwabin', nameUrdu: 'اوابین', nameAr: 'صلاة الأوابين', type: 'نفل', time: timings.Awwabin, time12: t12.Awwabin || this.format12Hour(timings.Awwabin), icon: '🌿' },
      { key: 'Isha', nameUrdu: 'عشاء', nameAr: 'العشاء', type: 'فرض', time: timings.Isha, time12: t12.Isha || this.format12Hour(timings.Isha), icon: '🌙' }
    ].filter(p => p.time && p.time !== '--:--');

    let currentActive = prayers[prayers.length - 1]; // default Isha/night

    for (let i = 0; i < prayers.length; i++) {
      const [h, m] = prayers[i].time.split(':').map(Number);
      const prayerSec = (h * 3600) + (m * 60);

      if (currentSec >= prayerSec) {
        currentActive = prayers[i];
      }

      if (prayerSec > currentSec) {
        const diffSec = prayerSec - currentSec;
        const remainingHours = Math.floor(diffSec / 3600);
        const remainingMinutes = Math.floor((diffSec % 3600) / 60);
        const remainingSeconds = diffSec % 60;

        return {
          currentActive,
          next: prayers[i],
          remainingHours,
          remainingMinutes,
          remainingSeconds,
          totalRemainingSeconds: diffSec,
          remainingTotalMinutes: Math.floor(diffSec / 60),
          isTomorrow: false,
          countdownFormatted: `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
          countdownUrdu: `${remainingHours > 0 ? `${remainingHours} گھنٹے ` : ''}${remainingMinutes} منٹ ${remainingSeconds} سیکنڈ`
        };
      }
    }

    // After Isha at night, next prayer/worship is Tahajjud early morning tomorrow
    const firstPrayer = prayers[0];
    const [h, m] = firstPrayer.time.split(':').map(Number);
    const firstSec = (h * 3600) + (m * 60);
    const diffSec = (24 * 3600 - currentSec) + firstSec;
    const remainingHours = Math.floor(diffSec / 3600);
    const remainingMinutes = Math.floor((diffSec % 3600) / 60);
    const remainingSeconds = diffSec % 60;

    return {
      currentActive,
      next: firstPrayer,
      remainingHours,
      remainingMinutes,
      remainingSeconds,
      totalRemainingSeconds: diffSec,
      remainingTotalMinutes: Math.floor(diffSec / 60),
      isTomorrow: true,
      countdownFormatted: `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
      countdownUrdu: `${remainingHours > 0 ? `${remainingHours} گھنٹے ` : ''}${remainingMinutes} منٹ ${remainingSeconds} سیکنڈ`
    };
  }

  // Subscribe to updates
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    for (const cb of this.listeners) {
      try { cb(this.currentTimings); } catch (e) { console.error(e); }
    }
  }

  // Automatic refresh daemon: checks Pakistan date rollover every 5 seconds
  startAutoRefreshDaemon() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);

    this.autoRefreshInterval = setInterval(() => {
      const pkt = this.getPakistanDate();
      if (this.lastFetchedDateStr && pkt.dateStrDDMMYYYY !== this.lastFetchedDateStr) {
        console.log(`[PrayerService] Midnight date rollover detected in Asia/Karachi (${pkt.dateStrDDMMYYYY}). Automatically refreshing timings...`);
        this.fetchTimings(this.currentCityKey, this.currentSchool);
      }
    }, 5000);
  }
}

// Global service instance
window.PAK_CITIES = PAK_CITIES;
window.prayerService = new PrayerTimeService();
window.prayerService.startAutoRefreshDaemon();
