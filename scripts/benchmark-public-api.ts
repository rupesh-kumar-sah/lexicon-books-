const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const targets = ['/api/health', '/api/books?limit=50', '/api/books/genres'];
const rounds = 15;

for (const path of targets) {
  const durations: number[] = [];
  let lastStatus = 0;
  for (let i = 0; i < rounds; i += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${path}`);
    await response.arrayBuffer();
    durations.push(performance.now() - started);
    lastStatus = response.status;
  }
  durations.sort((a, b) => a - b);
  const percentile = (p: number) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * p) - 1)];
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  console.log(JSON.stringify({ path, rounds, status: lastStatus, averageMs: Number(average.toFixed(2)), p50Ms: Number(percentile(0.5).toFixed(2)), p95Ms: Number(percentile(0.95).toFixed(2)), maxMs: Number(durations.at(-1)!.toFixed(2)) }));
}
