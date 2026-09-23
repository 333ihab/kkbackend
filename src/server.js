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

// ==========================================
// APP
// ==========================================

const app = express();

// Hide Express fingerprint
app.disable("x-powered-by");

console.log("=================================");
console.log("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Starting KineticKult Backend...");
console.log("=================================");

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

console.log(
  "FROM_EMAIL:",
  process.env.FROM_EMAIL
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

console.log(
  "ADMIN_EMAIL:",
  process.env.ADMIN_EMAIL
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

console.log(
  "GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY
    ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Loaded"
    : "ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Missing"
);

// ==========================================
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
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¥ ${req.method} ${req.originalUrl}`
  );

  next();
});

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .filter((value, index, arr) => arr.indexOf(value) === index);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests such as Postman/server-side requests
      // may not contain an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
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
  })
);

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

// ==========================================
// NEWSLETTER ROUTES
// ==========================================

console.log(
  "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Registering AI newsletter routes"
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
  "ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Registering waitlist routes"
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");

  console.log(
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ KineticKult Backend running on port ${PORT}`
  );

  console.log(
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â Local: http://localhost:${PORT}`
  );

  console.log(
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â Security: Helmet enabled`
  );

  console.log(
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Rate limiting: enabled`
  );

  console.log(
    `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â CORS origins: ${allowedOrigins.join(", ")}`
  );

  console.log("=================================");
});
