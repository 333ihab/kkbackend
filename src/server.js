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

// ==========================================
// APP
// ==========================================

const app = express();

// Hide Express fingerprint
app.disable("x-powered-by");

console.log("=================================");
console.log("🚀 Starting KineticKult Backend...");
console.log("=================================");

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL
    ? "✅ Loaded"
    : "❌ Missing"
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
    `📥 ${req.method} ${req.originalUrl}`
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
].filter(Boolean);

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
  "✅ Registering AI newsletter routes"
);

app.use(
  "/api/newsletter-ai",
  newsletterAIRoutes
);

app.use(
  "/api/newsletter",
  newsletterRoutes
);

// ==========================================
// WAITLIST ROUTES
// ==========================================

console.log(
  "✅ Registering waitlist routes"
);

app.use(
  "/api/waitlist",
  waitlistLimiter,
  waitlistRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  console.warn(
    `⚠️ Route not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error(
    "================================="
  );

  console.error(
    "❌ GLOBAL ERROR"
  );

  console.error(
    "Path:",
    req.originalUrl
  );

  console.error(
    "Method:",
    req.method
  );

  console.error(
    "Message:",
    err.message
  );

  if (process.env.NODE_ENV !== "production") {
    console.error(
      "Stack:",
      err.stack
    );
  }

  console.error(
    "================================="
  );

  // CORS error
  if (
    err.message ===
    "Not allowed by CORS"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Request blocked by CORS policy.",
    });
  }

  // Never expose internal errors in production
  const status =
    err.status ||
    err.statusCode ||
    500;

  return res.status(status).json({
    success: false,

    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : err.message ||
          "Internal Server Error",
  });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");

  console.log(
    `🚀 KineticKult Backend running on port ${PORT}`
  );

  console.log(
    `🌐 Local: http://localhost:${PORT}`
  );

  console.log(
    `🔐 Security: Helmet enabled`
  );

  console.log(
    `🛡️ Rate limiting: enabled`
  );

  console.log(
    `🌍 CORS origins: ${allowedOrigins.join(", ")}`
  );

  console.log("=================================");
});