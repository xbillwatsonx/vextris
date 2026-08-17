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
const pollIntervalMs = 10_000;
const timeoutMs = 120_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkTracks(cacheBust) {
  return Promise.all(tracks.map(async (track) => {
    const url = new URL(`music/${track}`, baseUrl);
    url.searchParams.set('verify', cacheBust);
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      return { track, url: url.toString(), status: response.status, ok: response.ok };
    } catch (error) {
      return { track, url, status: `ERROR: ${error instanceof Error ? error.message : String(error)}`, ok: false };
    }
  }));
}

const startedAt = Date.now();
let attempt = 0;
let lastFailures = [];

while (true) {
  attempt += 1;
  const elapsedMs = Date.now() - startedAt;
  console.log(`Live Pages music check attempt ${attempt} (${Math.floor(elapsedMs / 1000)}s elapsed).`);

  const cacheBust = `${attempt}-${Date.now()}`;
  const results = await checkTracks(cacheBust);
  for (const result of results) {
    console.log(`${result.status} ${result.url}`);
  }

  lastFailures = results.filter((result) => !result.ok);
  if (lastFailures.length === 0) {
    console.log(`Live Pages music verification passed (${tracks.length}/${tracks.length} OGG tracks, attempt ${attempt}).`);
    break;
  }

  const remainingMs = timeoutMs - (Date.now() - startedAt);
  if (remainingMs <= 0) {
    throw new Error(`Live Pages music verification timed out after ${attempt} attempts and ${timeoutMs / 1000}s. Unavailable tracks: ${lastFailures.map((result) => result.track).join(', ')}`);
  }

  console.log(`${lastFailures.length}/${tracks.length} tracks unavailable; retrying in ${Math.min(pollIntervalMs, remainingMs) / 1000}s.`);
  await sleep(Math.min(pollIntervalMs, remainingMs));
}
