const DEFAULT_TO = "orson@openazulejos.com";
const DEFAULT_FROM = "Open Azulejos <notifications@openazulejos.com>";

const publicBaseUrl = () => String(process.env.PUBLIC_BASE_URL || "https://openazulejos.com").replace(/\/$/, "");

const recipients = () => String(process.env.NOTIFICATION_EMAIL_TO || DEFAULT_TO)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const notificationConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = recipients();
  const from = String(process.env.NOTIFICATION_EMAIL_FROM || DEFAULT_FROM).trim();
  if (!apiKey || !from || !to.length) return null;
  return { apiKey, from, to };
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const mapsUrl = (lat, lng) => (
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`
    : null
);

async function sendNotificationEmail({ subject, text, html }) {
  const config = notificationConfig();
  if (!config) return { skipped: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject,
        text,
        html,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`email notification failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyNewContributor({ pseudonym, email, userId }) {
  const adminUrl = `${publicBaseUrl()}/admin`;
  const subject = `Open Azulejos: new contributor ${pseudonym || email || ""}`.trim();
  const lines = [
    "A new contributor account was created.",
    "",
    `Pseudonym: ${pseudonym || "unknown"}`,
    `Email: ${email || "unknown"}`,
    `User id: ${userId || "unknown"}`,
    "",
    `Admin: ${adminUrl}`,
  ];
  return sendNotificationEmail({
    subject,
    text: lines.join("\n"),
    html: `
      <p>A new contributor account was created.</p>
      <ul>
        <li><strong>Pseudonym:</strong> ${escapeHtml(pseudonym || "unknown")}</li>
        <li><strong>Email:</strong> ${escapeHtml(email || "unknown")}</li>
        <li><strong>User id:</strong> ${escapeHtml(userId || "unknown")}</li>
      </ul>
      <p><a href="${escapeHtml(adminUrl)}">Open admin</a></p>
    `,
  });
}

async function notifyNewSubmission({ record, contributor = null, imageUrl = null }) {
  const adminUrl = `${publicBaseUrl()}/admin`;
  const mapUrl = mapsUrl(record?.lat, record?.lng);
  const credit = record?.photographer_credit || contributor?.pseudonym || "anonymous";
  const subject = `Open Azulejos: new submission from ${credit}`;
  const lines = [
    "A new azulejo submission is pending moderation.",
    "",
    `Record id: ${record?.id || "unknown"}`,
    `Contributor: ${credit}`,
    `Contributor id: ${contributor?.userId || "anonymous"}`,
    `Coordinates: ${record?.lat ?? "unknown"}, ${record?.lng ?? "unknown"}`,
    mapUrl ? `Map: ${mapUrl}` : null,
    imageUrl || record?.image_url ? `Image: ${imageUrl || record.image_url}` : null,
    "",
    `Admin: ${adminUrl}`,
  ].filter(Boolean);
  return sendNotificationEmail({
    subject,
    text: lines.join("\n"),
    html: `
      <p>A new azulejo submission is pending moderation.</p>
      <ul>
        <li><strong>Record id:</strong> ${escapeHtml(record?.id || "unknown")}</li>
        <li><strong>Contributor:</strong> ${escapeHtml(credit)}</li>
        <li><strong>Contributor id:</strong> ${escapeHtml(contributor?.userId || "anonymous")}</li>
        <li><strong>Coordinates:</strong> ${escapeHtml(`${record?.lat ?? "unknown"}, ${record?.lng ?? "unknown"}`)}</li>
      </ul>
      ${mapUrl ? `<p><a href="${escapeHtml(mapUrl)}">Open in Google Maps</a></p>` : ""}
      ${imageUrl || record?.image_url ? `<p><a href="${escapeHtml(imageUrl || record.image_url)}">Open image</a></p>` : ""}
      <p><a href="${escapeHtml(adminUrl)}">Open admin</a></p>
    `,
  });
}

module.exports = {
  notifyNewContributor,
  notifyNewSubmission,
  sendNotificationEmail,
};
