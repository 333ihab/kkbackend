// ==========================================
// NOT FOUND HANDLER
// ==========================================

const notFoundHandler = (req, res) => {
  console.warn(`\u26a0\ufe0f Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
};

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

const globalErrorHandler = (err, req, res, next) => {
  console.error("=================================");
  console.error("\u274c GLOBAL ERROR");
  console.error("Path:", req.originalUrl);
  console.error("Method:", req.method);
  console.error("Message:", err.message);

  if (process.env.NODE_ENV !== "production") {
    console.error("Stack:", err.stack);
  }

  console.error("=================================");

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Request blocked by CORS policy.",
    });
  }

  // Never expose internal errors in production
  const status = err.status || err.statusCode || 500;

  return res.status(status).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : err.message || "Internal Server Error",
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};