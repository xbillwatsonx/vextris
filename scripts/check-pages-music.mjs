import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const expectedTracks = [
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

const musicDir = resolve(import.meta.dirname, '../dist/music');
const publishedTracks = readdirSync(musicDir).filter((file) => file.endsWith('.ogg')).sort();
const missingTracks = expectedTracks.filter((track) => !publishedTracks.includes(track));
const unexpectedTracks = publishedTracks.filter((track) => !expectedTracks.includes(track));

if (missingTracks.length > 0 || unexpectedTracks.length > 0) {
  throw new Error([
    `dist/music must contain exactly the ${expectedTracks.length} Vextris OGG tracks.`,
    missingTracks.length > 0 ? `Missing: ${missingTracks.join(', ')}` : '',
    unexpectedTracks.length > 0 ? `Unexpected: ${unexpectedTracks.join(', ')}` : '',
  ].filter(Boolean).join(' '));
}

console.log(`Pages music build check passed (${expectedTracks.length} OGG tracks).`);
