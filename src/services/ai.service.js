const MAX_TOPIC_LENGTH = 200;

// Strip HTML/script content from user-supplied topic before interpolation
const sanitizeTopic = (value) => {
  return String(value)
    .replace(/[<>]/g, "")   // remove angle brackets (blocks tag injection)
    .replace(/[\u0000-\u001F\u007F]/g, "") // strip control chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TOPIC_LENGTH);
};

const generateNewsletter = async (topic) => {
  const safeTopic = sanitizeTopic(topic);
  return `
  <html>
    <body style="font-family: Arial, sans-serif; max-width: 700px; margin: auto;">
      <h1>Kenetic Kult Weekly Newsletter</h1>

      <h2>${safeTopic}</h2>

      <p>
        Progress isn't built in a single workout. It's built through
        consistency, discipline, and showing up when nobody is watching.
      </p>

      <p>
        At Kenetic Kult, we believe transformation happens through
        repeated action. Whether your goal is strength, endurance,
        body composition, or mindset, every session matters.
      </p>

      <p>
        This week, focus on doing the basics exceptionally well:
      </p>

      <ul>
        <li>Train with intent</li>
        <li>Recover properly</li>
        <li>Fuel your body</li>
        <li>Stay consistent</li>
      </ul>

      <p>
        Remember: motivation comes and goes, but discipline stays.
      </p>

      <hr />

      <p>
        <strong>Kenetic Kult Team</strong><br/>
        Build Strength. Build Discipline. Build Community.
      </p>
    </body>
  </html>
  `;
};

module.exports = {
  generateNewsletter,
};