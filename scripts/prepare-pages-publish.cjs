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

/**
 * gh-pages restores the existing gh-pages branch before staging dist/. That
 * branch contains a tracked .gitignore with /music/, so force-add the runtime
 * tracks and inspect the staged candidate tree before gh-pages creates a commit.
 */
module.exports = async function preparePagesPublish(git) {
  const musicPaths = expectedTracks.map((track) => `music/${track}`);
  await git.exec('add', '--force', '--', ...musicPaths);
  await git.exec('write-tree');
  const candidateTree = git.output.trim();
  await git.exec('ls-tree', '-r', '--name-only', candidateTree, '--', 'music');

  const stagedTracks = new Set(git.output.trim().split('\n').filter(Boolean));
  const missingTracks = musicPaths.filter((track) => !stagedTracks.has(track));
  if (missingTracks.length > 0) {
    throw new Error(`Pages candidate tree is missing music tracks: ${missingTracks.join(', ')}`);
  }

  console.log(`Pages candidate tree includes all ${musicPaths.length} music tracks.`);
};
