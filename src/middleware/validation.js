const { z } = require("zod");

// ==========================================
// SCHEMAS
// ==========================================

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address");

const waitlistSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name too short")
    .max(100, "Name too long"),

  email: emailSchema,

  phone: z
    .string()
    .trim()
    .regex(/^[\d+()\-\s]{8,25}$/, "Invalid phone number")
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
      },
      "Invalid phone number"
    ),

  address: z
    .string()
    .trim()
    .min(5, "Address too short")
    .max(500, "Address too long"),

  size: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => ["XS", "S", "M", "L", "XL", "XXL"].includes(value),
      "Invalid T-shirt size"
    ),
});

const newsletterSchema = z.object({
  email: emailSchema,
});

const newsletterAISchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .max(200, "Topic must be 200 characters or fewer"),
});

// ==========================================
// VALIDATION MIDDLEWARE FACTORY
// ==========================================

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;

    return next();
  };
};

module.exports = {
  validate,
  waitlistSchema,
  newsletterSchema,
  newsletterAISchema,
};