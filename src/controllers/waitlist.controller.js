const waitlistService = require("../services/waitlist.service");
const emailService = require("../services/email.service");

const ALLOWED_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

// ==========================================
// SANITIZATION
// ==========================================

const sanitizeName = (value) => {
  return String(value)
    .replace(/[^\p{L}\p{M}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
};

const sanitizeEmail = (value) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 254);
};

const sanitizePhone = (value) => {
  return String(value)
    .replace(/[^\d+()\-\s]/g, "")
    .trim()
    .slice(0, 25);
};

const sanitizeAddress = (value) => {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
};

// ==========================================
// CREATE WAITLIST
// ==========================================

const createWaitlist = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      size,
    } = req.body;

    // ==========================================
    // TYPE VALIDATION
    // ==========================================

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof address !== "string" ||
      typeof size !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data.",
      });
    }

    // ==========================================
    // SANITIZE
    // ==========================================

    const cleanFullName =
      sanitizeName(fullName);

    const cleanEmail =
      sanitizeEmail(email);

    const cleanPhone =
      sanitizePhone(phone);

    const cleanAddress =
      sanitizeAddress(address);

    const cleanSize =
      size.trim().toUpperCase();

    // ==========================================
    // NAME VALIDATION
    // ==========================================

    if (
      cleanFullName.length < 2 ||
      cleanFullName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid full name.",
      });
    }

    // ==========================================
    // EMAIL VALIDATION
    // ==========================================

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

    // ==========================================
    // PHONE VALIDATION
    // ==========================================

    const phoneDigits =
      cleanPhone.replace(/\D/g, "");

    if (
      phoneDigits.length < 8 ||
      phoneDigits.length > 15
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    // ==========================================
    // ADDRESS VALIDATION
    // ==========================================

    if (
      cleanAddress.length < 5 ||
      cleanAddress.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery address.",
      });
    }

    // ==========================================
    // SIZE VALIDATION
    // ==========================================

    if (!ALLOWED_SIZES.includes(cleanSize)) {
      return res.status(400).json({
        success: false,
        message: "Invalid T-shirt size.",
      });
    }

    // ==========================================
    // SAVE TO SUPABASE
    // ==========================================

    const waitlistEntry =
      await waitlistService.createWaitlistEntry({
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        size: cleanSize,
      });

    console.log(
      "Ã¢Å“â€¦ Waitlist entry saved:",
      waitlistEntry.id
    );

    // ==========================================
    // SEND EMAILS
    // ==========================================

    let emailFailed = false;

    try {
      await emailService.sendWaitlistEmails({
        name: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        size: cleanSize,
      });

      console.log(
        "Ã¢Å“â€¦ Waitlist emails sent."
      );

    } catch (emailError) {
      emailFailed = true;

      console.error(
        "Ã¢ÂÅ’ Resend email error:"
      );

      console.error(
        "Message:",
        emailError.message
      );

      console.error(
        "Code:",
        emailError.code
      );

      console.error(
        "Name:",
        emailError.name
      );

      console.error(
        "StatusCode:",
        emailError.statusCode
      );
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(201).json({
      success: true,

      message: emailFailed
        ? "Successfully joined the waitlist, but confirmation emails could not be sent."
        : "Successfully joined the waitlist.",

      data: {
        id: waitlistEntry.id,
        name: waitlistEntry.name,
        email: waitlistEntry.email,
        size: waitlistEntry.size,
        created_at: waitlistEntry.created_at,
      },
    });

  } catch (error) {

    // ==========================================
    // DUPLICATE EMAIL (Postgres unique violation)
    // ==========================================

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This email is already on the waitlist.",
      });
    }

    console.error(
      "================================="
    );

    console.error(
      "Ã¢ÂÅ’ WAITLIST ERROR"
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "Code:",
      error.code
    );

    console.error(
      "Details:",
      error.details
    );

    console.error(
      "Hint:",
      error.hint
    );

    console.error(
      "================================="
    );

    return res.status(500).json({
      success: false,
      message: "Failed to join the waitlist.",
    });
  }
};

module.exports = {
  createWaitlist,
};