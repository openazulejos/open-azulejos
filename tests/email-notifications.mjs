import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  notifyNewContributor,
  notifyNewSubmission,
} = require("../api/_email-notifications.js");

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

try {
  delete process.env.RESEND_API_KEY;
  let called = false;
  global.fetch = async () => {
    called = true;
    return { ok: true, json: async () => ({ id: "email" }) };
  };
  const skipped = await notifyNewContributor({
    pseudonym: "Orson",
    email: "orson@example.com",
    userId: "user-1",
  });
  assert.equal(skipped.skipped, true, "notifications should be skipped without RESEND_API_KEY");
  assert.equal(called, false, "notifications must not call fetch without RESEND_API_KEY");

  process.env.RESEND_API_KEY = "re_test";
  process.env.NOTIFICATION_EMAIL_TO = "orson@openazulejos.com, archive@openazulejos.com";
  process.env.NOTIFICATION_EMAIL_FROM = "Open Azulejos <notifications@openazulejos.com>";
  process.env.PUBLIC_BASE_URL = "https://openazulejos.test/";
  let request;
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ id: "email-1" }) };
  };
  await notifyNewSubmission({
    record: {
      id: "az-1",
      lat: 38.72,
      lng: -9.14,
      image_url: "https://example.com/az.jpg",
      photographer_credit: "Thestroller",
    },
    contributor: { userId: "user-2", pseudonym: "Thestroller" },
  });
  assert.equal(request.url, "https://api.resend.com/emails", "notifications should use Resend");
  assert.equal(request.options.headers.Authorization, "Bearer re_test", "Resend API key should be sent as bearer token");
  assert.deepEqual(request.body.to, ["orson@openazulejos.com", "archive@openazulejos.com"], "comma-separated recipients should be supported");
  assert.match(request.body.subject, /new submission/i, "submission email should have a useful subject");
  assert.match(request.body.text, /38\.72, -9\.14/, "submission email should include coordinates");
  assert.match(request.body.html, /openazulejos\.test\/admin/, "submission email should link to admin");
} finally {
  process.env = originalEnv;
  global.fetch = originalFetch;
}
