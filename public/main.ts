// Vextris — main entry point
// v0.3 scaffold: no gameplay implementation yet.
// Initializes the renderer and game state shell.

function main() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Fatal: #game-canvas not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Fatal: 2D context unavailable');
    return;
  }

  // Placeholder: clear to background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Placeholder: draw grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  const cellSize = canvas.width / 10;
  for (let col = 0; col <= 10; col++) {
    ctx.beginPath();
    ctx.moveTo(col * cellSize, 0);
    ctx.lineTo(col * cellSize, canvas.height);
    ctx.stroke();
  }
  for (let row = 0; row <= 20; row++) {
    const y = row * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  console.log('Vextris scaffold initialized.');
}

main();
