const { Resend } = require("resend");
const supabase = require("../config/supabase");
const aiService = require("./ai.service");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const MAX_RECIPIENTS_PER_RUN = 200;
const BATCH_SIZE = 50;

// ==========================================
// WEEKLY TOPIC POOL (rotates by ISO week)
// ==========================================

const TOPIC_POOL = [
  "Why consistency beats motivation in training",
  "The discipline of showing up when nobody is watching",
  "How sleep quality determines muscle growth",
  "Training through discomfort: the growth zone",
  "Nutrition basics: fueling performance without obsession",
  "The mental side of strength training",
  "Recovery is training: why rest days build muscle",
  "Building habits that outlast motivation",
  "From beginner to athlete: the long game",
  "Community and accountability: why we train together",
];

const getWeeklyTopic = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );

  return TOPIC_POOL[weekNumber % TOPIC_POOL.length];
};

// ==========================================
// RECIPIENTS
// ==========================================

const getShirtMembers = async () => {
  const { data, error } = await supabase
    .from("clothing_waitlist")
    .select("email, name");

  if (error) {
    throw error;
  }

  // unique + valid-looking emails only
  const seen = new Set();
  const recipients = [];

  for (const row of data || []) {
    const email = String(row.email || "")
      .trim()
      .toLowerCase();

    if (
      email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      !seen.has(email)
    ) {
      seen.add(email);
      recipients.push({ email, name: row.name });
    }
  }

  return recipients;
};

// ==========================================
// SEND
// ==========================================

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const sendWeeklyNewsletter = async ({ testMode = false } = {}) => {
  const topic = getWeeklyTopic();
  console.log(`\ud83d\udcec Weekly newsletter generation for topic: "${topic}"`);

  const html = await aiService.generateNewsletter(topic);

  const subject = `KeneticKult Weekly \u2014 ${topic}`;

  // Resolve recipients
  let recipients;

  if (testMode) {
    recipients = [{ email: ADMIN_EMAIL, name: "Admin" }];
    console.log("\ud83e\uddea TEST MODE: sending to admin only");
  } else {
    recipients = await getShirtMembers();

    if (recipients.length > MAX_RECIPIENTS_PER_RUN) {
      recipients = recipients.slice(0, MAX_RECIPIENTS_PER_RUN);
    }

    console.log(`\ud83d\udce4 Sending to ${recipients.length} shirt members`);
  }

  // Batch send
  const batches = chunk(recipients, BATCH_SIZE);
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const batch of batches) {
    const messages = batch.map((r) => ({
      from: FROM_EMAIL,
      to: [r.email],
      subject,
      html,
    }));

    try {
      const { data, error } = await resend.batch.send(messages);

      if (error) {
        failed += batch.length;
        errors.push(error.message);
      } else {
        sent += Array.isArray(data) ? data.length : batch.length;
      }
    } catch (err) {
      failed += batch.length;
      errors.push(err.message);
    }
  }

  const summary = {
    success: failed === 0,
    topic,
    totalRecipients: recipients.length,
    sent,
    failed,
    errors,
    testMode,
  };

  console.log(
    `\u2705 Weekly newsletter done: ${sent} sent, ${failed} failed`
  );

  return summary;
};

module.exports = {
  sendWeeklyNewsletter,
  getWeeklyTopic,
};