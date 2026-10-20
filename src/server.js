const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

// ==========================================
// LOAD ENVIRONMENT VARIABLES FIRST
// ==========================================

dotenv.config();

// ==========================================
// ROUTES
// ==========================================

const newsletterAIRoutes = require("./routes/newsletterAI.routes");
const newsletterRoutes = require("./routes/newsletter.routes");
const waitlistRoutes = require("./routes/waitlist.routes");
const {
  validate,
  waitlistSchema,
  newsletterSchema,
  newsletterAISchema,
} = require("./middleware/validation");

const {
  notFoundHandler,
  globalErrorHandler,
} = require("./middleware/errorHandler");

const {
  startWeeklyNewsletterJob,
} = require("./jobs/weekly-newsletter.job");
const waitlistService = require("./services/waitlist.service");

// ==========================================
// APP
// ==========================================

const app = express();

// Hide Express fingerprint
app.disable("x-powered-by");

console.log("KineticKult Backend starting.");

// TRUST PROXY
// ==========================================
//
// Set this to 1 if your backend is behind
// one reverse proxy such as Render, Railway,
// Nginx, Cloudflare, etc.
//
// This is important for rate limiting
// to correctly identify client IPs.
//

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ==========================================
// HELMET
// ==========================================

app.use(
  helmet({
    // Prevent browsers from guessing content types
    contentTypeOptions: true,

    // Prevent clickjacking
    frameguard: {
      action: "deny",
    },

    // Referrer protection
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // Cross-origin protection
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    // Prevent DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },

    // Prevent browsers from performing
    // automatic download execution
    xDownloadOptions: true,

    // Enable HSTS only in production
    strictTransportSecurity:
      process.env.NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,

    // Disable CSP here because this is primarily
    // an API and your frontend handles its own CSP.
    contentSecurityPolicy: false,
  })
);

// ==========================================
// COMPRESSION
// ==========================================

app.use(compression());

// ==========================================
// HTTP REQUEST LOGGING
// ==========================================

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);

// ==========================================
// REQUEST LOGGER
// ==========================================

app.use((req, res, next) => {
  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ ${req.method} ${req.originalUrl}`
  );

  next();
});

// ==========================================
// CORS
// ==========================================
//
// Production origins come from process.env.FRONTEND_URL
// (set on Render to: FRONTEND_URL=https://kenetickult.com)
//
// FRONTEND_URL may contain a single URL or a comma-separated list:
// FRONTEND_URL=https://kenetickult.com,https://www.kenetickult.com
//
// Origins are normalized (trailing slashes removed) and, for apex
// domains, the "www." variant is allowed automatically so that
// https://kenetickult.com and https://www.kenetickult.com both work.

const normalizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const envFrontendOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [
  // Local development only (never used for production matching
  // unless NODE_ENV is development):
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...envFrontendOrigins,
  // Automatically allow the www variant of every configured origin
  ...envFrontendOrigins.map(
    (origin) =>
      origin.startsWith("https://") && !origin.startsWith("https://www.")
        ? origin.replace("https://", "https://www.")
        : null
  ),
]
  .filter(Boolean)
  .filter((value, index, arr) => arr.indexOf(value) === index);

const corsOptions = {
  origin: (origin, callback) => {
    // Requests such as Postman/server-side/curl requests
    // may not contain an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Blocked request from origin: ${origin}`
    );
    console.warn(
      `[CORS] Allowed origins: ${allowedOrigins.join(", ")}`
    );

    // Do NOT throw an error: throwing makes Express respond via the
    // error handler WITHOUT any Access-Control-Allow-Origin header,
    // which the browser reports as a CORS failure. Instead, reject
    // cleanly with a proper 403 response that still goes through
    // normal middleware flow.
    return callback(null, false);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  maxAge: 86400,
};

// Register CORS BEFORE all routes (this also handles OPTIONS
// preflight requests automatically for every route).
app.use(cors(corsOptions));

// Explicit preflight fallback (Express 5-safe): guarantees every
// OPTIONS request terminates with a 204 response carrying the
// CORS headers set above, even if no route matches.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

if (!envFrontendOrigins.length) {
  console.warn(
    "[CORS] WARNING: FRONTEND_URL is not set. " +
      "Production origins will NOT be allowed. " +
      "Set FRONTEND_URL=https://kenetickult.com on Render."
  );
}

// ==========================================
// BODY PARSERS
// ==========================================

app.use(
  express.json({
    limit: "100kb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  })
);

// ==========================================
// HTTP PARAMETER POLLUTION PROTECTION
// ==========================================

app.use(hpp());

// ==========================================
// GLOBAL RATE LIMITER
// ==========================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 100,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },

  skip: (req) => {
    // Don't rate-limit health checks
    return req.path === "/";
  },
});

app.use(globalLimiter);

// ==========================================
// WAITLIST RATE LIMITER
// ==========================================

const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many waitlist submissions. Please try again later.",
  },
});


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "KineticKult Backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Keep liveness independent of Supabase so Render checks don't generate DB traffic.
app.get("/health", (req, res) => {
  res.status(200).json({ application: "available" });
});

// On-demand diagnostic only; do not poll frequently to prevent inactivity pauses.
app.get("/health/database", async (req, res) => {
  try {
    await waitlistService.checkDatabase();
    return res.status(200).json({ application: "available", database: "available" });
  } catch (error) {
    console.error("[health] Supabase check failed", {
      name: error.cause?.name || error.name,
      code: error.cause?.code || error.cause?.cause?.code || error.code,
      status: error.cause?.status || error.cause?.statusCode || error.status,
    });
    return res.status(503).json({ application: "available", database: "unavailable" });
  }
});

// ==========================================
// NEWSLETTER ROUTES
// ==========================================

console.log(
  "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Registering AI newsletter routes"
);

// ==========================================
// AI NEWSLETTER RATE LIMITER
// (stricter: AI generation is expensive)
// ==========================================

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,

  max: 20,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many newsletter generation requests. Please try again later.",
  },
});

app.use(
  "/api/newsletter-ai",
  aiLimiter,
  validate(newsletterAISchema),
  newsletterAIRoutes
);

app.use(
  "/api/newsletter",
  validate(newsletterSchema),
  newsletterRoutes
);

// ==========================================
// WAITLIST ROUTES
// ==========================================

console.log(
  "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Registering waitlist routes"
);

app.use(
  "/api/waitlist",
  waitlistLimiter,
  validate(waitlistSchema),
  waitlistRoutes
);

// ==========================================
// 404 + GLOBAL ERROR HANDLERS (middleware)
// ==========================================

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ==========================================
// START SERVER
// ==========================================

// ==========================================
// SCHEDULED JOBS
// ==========================================

startWeeklyNewsletterJob();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");

  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ KineticKult Backend running on port ${PORT}`
  );

  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Local: http://localhost:${PORT}`
  );

  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Security: Helmet enabled`
  );

  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Rate limiting: enabled`
  );

  console.log(
    `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â CORS origins: ${allowedOrigins.join(", ")}`
  );

  console.log("=================================");
});
