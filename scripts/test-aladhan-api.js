/**
 * Terminal test script for Aladhan API endpoints.
 * Run: node scripts/test-aladhan-api.js
 */

const BASE = 'https://api.aladhan.com/v1';
const DATE = '10-06-2026';
const LAT = 24.8607;
const LNG = 67.0011;
const CITY = 'Karachi';
const COUNTRY = 'Pakistan';
const ADDRESS = 'Karachi, Pakistan';

async function get(label, path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url);
  const json = await res.json();
  console.log(`\n── ${label} ──`);
  console.log('URL:', url);
  if (json.code !== 200) {
    console.log('ERROR:', json.status, json.data);
    return;
  }
  const { timings, meta, date } = json.data;
  console.log('Status:', json.code, json.status);
  if (timings) {
    console.log('Timings:', JSON.stringify({
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    }));
  }
  if (meta) console.log('Timezone:', meta.timezone, '| Method:', meta.method?.name);
  if (date?.hijri) console.log('Hijri:', `${date.hijri.day} ${date.hijri.month?.en} ${date.hijri.year} AH`);
}

async function main() {
  console.log('NamazGuard — Aladhan API Test');
  console.log('Date:', DATE);

  await get('timings (coords)', `/timings/${DATE}?latitude=${LAT}&longitude=${LNG}&method=1&school=1`);
  await get('timingsByCity', `/timingsByCity/${DATE}?city=${CITY}&country=${COUNTRY}&method=1&school=1`);
  await get('timingsByAddress', `/timingsByAddress/${DATE}?address=${encodeURIComponent(ADDRESS)}&method=1&school=1`);
  await get('nextPrayer (coords)', `/nextPrayer/${DATE}?latitude=${LAT}&longitude=${LNG}&method=1&school=1`);
  await get('nextPrayerByAddress', `/nextPrayerByAddress/${DATE}?address=${encodeURIComponent(ADDRESS)}&method=1&school=1`);

  // Future date test
  await get('timings future', `/timings/15-07-2026?latitude=${LAT}&longitude=${LNG}&method=1&school=1`);

  console.log('\n✓ All endpoint tests complete.\n');
}

main().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
