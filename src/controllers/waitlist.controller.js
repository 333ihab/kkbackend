const waitlistService = require("../services/waitlist.service");
const emailService = require("../services/email.service");

const createWaitlist = async (req, res) => {
  try {

    const {
      fullName,
      email,
      phone,
      address,
      size,
    } = req.body;


    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !fullName ||
      !email ||
      !phone ||
      !address ||
      !size
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }


    /*
     * ==========================================
     * SIZE VALIDATION
     * ==========================================
     */

    const allowedSizes = [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
    ];


    if (!allowedSizes.includes(size)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size",
      });
    }


    /*
     * ==========================================
     * SAVE TO SUPABASE
     * ==========================================
     */

    const waitlistEntry =
      await waitlistService.createWaitlistEntry({
        fullName,
        email,
        phone,
        address,
        size,
      });


    console.log(
      "✅ Waitlist entry saved:",
      waitlistEntry
    );


    /*
     * ==========================================
     * SEND EMAILS
     * ==========================================
     */

    let emailFailed = false;

    try {

      await emailService.sendWaitlistEmails({
        name: fullName,
        email,
        size,
      });

    } catch (emailError) {
      emailFailed = true;

      console.error(
        "❌ Resend email error:"
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


    /*
     * ==========================================
     * SUCCESS RESPONSE
     * ==========================================
     */

    return res.status(201).json({
      success: true,
      message: emailFailed
        ? "Successfully joined the waitlist, but confirmation emails could not be sent."
        : "Successfully joined the waitlist",
      data: waitlistEntry,
    });


  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "❌ WAITLIST ERROR"
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
      message: "Failed to join the waitlist",
    });

  }
};


module.exports = {
  createWaitlist,
};
