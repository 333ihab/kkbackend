const {
  createSubscriber,
} = require("../services/newsletter.service");

// ==========================================
// SANITIZATION
// ==========================================

const sanitizeEmail = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 254);
};

const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = sanitizeEmail(email);

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(cleanEmail) ||
      cleanEmail.length > 254
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }

    const subscriber =
      await createSubscriber(cleanEmail);

    res.status(201).json({
      success: true,
      data: subscriber,
    });
  } catch (error) {

    // ==========================================
    // DUPLICATE EMAIL (Postgres unique violation)
    // ==========================================

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed.",
      });
    }

    next(error);
  }
};

module.exports = {
  subscribe,
};