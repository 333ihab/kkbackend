const { GoogleGenerativeAI } = require("@google/generative-ai");

const MAX_TOPIC_LENGTH = 200;
const MODEL_NAME = "gemini-3.6-flash";
const GENERATION_TIMEOUT_MS = 30000;

// ==========================================
// TOPIC SANITIZATION
// ==========================================

const sanitizeTopic = (value) => {
  return String(value)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TOPIC_LENGTH);
};

// ==========================================
// OUTPUT CLEANING
// ==========================================

const cleanAiHtml = (value) => {
  return String(value)
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("|').*?\1/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
};

// ==========================================
// STATIC FALLBACK TEMPLATE
// ==========================================

const fallbackNewsletter = (topic) => `
  <html>
    <body style="font-family: Arial, sans-serif; max-width: 700px; margin: auto;">
      <h1>Kenetic Kult Weekly Newsletter</h1>
      <h2>${sanitizeTopic(topic)}</h2>
      <p>
        Progress is not built in a single workout. It is built through
        consistency, discipline, and showing up when nobody is watching.
      </p>
      <ul>
        <li>Train with intent</li>
        <li>Recover properly</li>
        <li>Fuel your body</li>
        <li>Stay consistent</li>
      </ul>
      <hr />
      <p>
        <strong>Kenetic Kult Team</strong><br/>
        Build Strength. Build Discipline. Build Community.
      </p>
    </body>
  </html>
`;
// ==========================================
// GEMINI GENERATION
// ==========================================

const generateWithGemini = async (topic) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
    },
  });

  const prompt = [
    "You are the newsletter writer for Kenetic Kult, a premium athletic apparel brand.",
    "Brand voice: intense, disciplined, no-excuses. Short punchy sentences. Motivational but not cringe.",
    "Themes: strength training, discipline, consistency, transformation, community.",
    "",
    'Write a weekly newsletter (200-350 words) about this topic: "' + topic + '"',
    "",
    "Rules:",
    "- Output ONLY the newsletter body HTML. No html, head or body tags.",
    "- No scripts, no iframes, no inline event handlers, no external links.",
    "- Use an h2 title and simple p, ul, li tags only.",
    "- End with: <p><strong>Kenetic Kult Team</strong></p>",
  ].join("\n");

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text || text.trim().length === 0) {
    throw new Error("Empty response from Gemini");
  }

  const cleaned = cleanAiHtml(text);

  // Truncation guard: the prompt requires a signature ending.
  // If it is missing the output was cut off (e.g. token limit).
  if (!cleaned.includes("Kenetic Kult Team")) {
    throw new Error("Incomplete response from Gemini (truncated)");
  }

  return cleaned;
};

// ==========================================
// PUBLIC API (with fallback + timeout)
// ==========================================

const generateNewsletter = async (topic) => {
  const safeTopic = sanitizeTopic(topic);

  try {
    const withTimeout = Promise.race([
      generateWithGemini(safeTopic),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Gemini timeout")),
          GENERATION_TIMEOUT_MS
        )
      ),
    ]);

    return await withTimeout;
  } catch (error) {
    console.error("AI generation failed, using fallback template:", error.message);
    return fallbackNewsletter(safeTopic);
  }
};

module.exports = {
  generateNewsletter,
};
