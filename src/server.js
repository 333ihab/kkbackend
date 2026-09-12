const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Load environment variables first
dotenv.config();

// Routes
const newsletterAIRoutes = require("./routes/newsletterAI.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const waitlistRoutes = require("./routes/waitlist.routes");

const app = express();

console.log("=================================");
console.log("🚀 Starting KineticKult Backend...");
console.log("=================================");

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "✅ Loaded" : "❌ Missing"
);

console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "✅ Loaded"
    : "❌ Missing"
);

console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY
    ? "✅ Loaded"
    : "❌ Missing"
);

console.log(
  "FROM_EMAIL:",
  process.env.FROM_EMAIL
    ? "✅ Loaded"
    : "❌ Missing"
);

console.log(
  "ADMIN_EMAIL:",
  process.env.ADMIN_EMAIL
    ? "✅ Loaded"
    : "❌ Missing"
);

console.log(
  "GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY
    ? "✅ Loaded"
    : "❌ Missing"
);

/**
 * Security Headers
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/**
 * Compression
 */
app.use(compression());

/**
 * Logging
 */
app.use(morgan("dev"));

/**
 * Request Debugger
 */
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Rate Limiter
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use(limiter);

/**
 * CORS
 */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

/**
 * Body Parsers
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "KineticKult Backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Newsletter Routes
 */
console.log("✅ Registering AI newsletter routes");

app.use(
  "/api/newsletter-ai",
  newsletterAIRoutes
);

app.use(
  "/api/newsletter",
  newsletterRoutes
);

/**
 * Waitlist Routes
 */
console.log("✅ Registering waitlist routes");

app.use(
  "/api/waitlist",
  waitlistRoutes
);

/**
 * 404
 */
app.use((req, res) => {
  console.warn(
    `⚠️ Route not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error("=================================");
  console.error("❌ GLOBAL ERROR");
  console.error("Path:", req.originalUrl);
  console.error("Method:", req.method);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("=================================");

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/**
 * Startup
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 KineticKult Backend running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log("=================================");
});