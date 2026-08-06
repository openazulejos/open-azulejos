import assert from "node:assert/strict";
import { fetchWithRetry, isRetryableStatus } from "../scripts/fetch-with-retry.mjs";

assert.equal(isRetryableStatus(504), true);
assert.equal(isRetryableStatus(429), true);
assert.equal(isRetryableStatus(404), false);

{
  const statuses = [504, 503, 200];
  const delays = [];
  const response = await fetchWithRetry("https://example.test/image.jpg", {}, {
    fetchImpl: async () => new Response("image", { status: statuses.shift() }),
    sleep: async (delay) => delays.push(delay),
    baseDelayMs: 10,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(delays, [10, 20]);
}

{
  let calls = 0;
  const response = await fetchWithRetry("https://example.test/missing.jpg", {}, {
    fetchImpl: async () => {
      calls += 1;
      return new Response("missing", { status: 404 });
    },
    sleep: async () => assert.fail("404 responses must not be retried"),
  });
  assert.equal(response.status, 404);
  assert.equal(calls, 1);
}

{
  let calls = 0;
  const response = await fetchWithRetry("https://example.test/image.jpg", {}, {
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) throw new TypeError("fetch failed");
      return new Response("image", { status: 200 });
    },
    sleep: async () => {},
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
}

console.log("fetch retry tests passed");
