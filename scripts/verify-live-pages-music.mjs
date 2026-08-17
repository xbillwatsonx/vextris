const tracks = [
  'Vextris 01.ogg',
  'Vextris 02.ogg',
  'Vextris 03.ogg',
  'Vextris-04.ogg',
  'Vextris-05.ogg',
  'Vextris-06.ogg',
  'Vextris-07.ogg',
  'Vextris-Danger-State.ogg',
  'Vextris-Emergency.ogg',
];

const pagesUrl = process.env.PAGES_URL ?? 'https://xbillwatsonx.github.io/vextris/';
const baseUrl = new URL(pagesUrl.endsWith('/') ? pagesUrl : `${pagesUrl}/`);

const results = await Promise.all(tracks.map(async (track) => {
  const url = new URL(`music/${track}`, baseUrl).toString();
  const response = await fetch(url, { redirect: 'follow' });
  return { track, url, status: response.status, ok: response.ok };
}));

for (const result of results) {
  console.log(`${result.status} ${result.url}`);
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
  throw new Error(`Live Pages music verification failed for: ${failures.map((result) => result.track).join(', ')}`);
}

console.log(`Live Pages music verification passed (${tracks.length} OGG tracks).`);
