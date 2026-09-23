const cron = require("node-cron");
const {
  sendWeeklyNewsletter,
} = require("../services/weekly-newsletter.service");

// ==========================================
// WEEKLY NEWSLETTER JOB
// Every Monday at 09:00 (server local time)
// ==========================================

let lastRunWeek = null;

const runIfNotAlreadySentThisWeek = () => {
  const weekKey = new Date().toISOString().slice(0, 7) + "-" +
    Math.ceil(new Date().getDate() / 7);

  if (weekKey === lastRunWeek) {
    console.log("\u23ed\ufe0f Weekly newsletter already sent this week, skipping.");
    return;
  }

  lastRunWeek = weekKey;

  sendWeeklyNewsletter({ testMode: false }).catch((err) => {
    console.error("\u274c Weekly newsletter job failed:", err.message);
  });
};

const startWeeklyNewsletterJob = () => {
  // Monday 09:00
  cron.schedule(
    "0 9 * * 1",
    runIfNotAlreadySentThisWeek
  );

  console.log(
    "\u23f0 Weekly newsletter job scheduled: every Monday at 09:00"
  );
};

module.exports = {
  startWeeklyNewsletterJob,
};