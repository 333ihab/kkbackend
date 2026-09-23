const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Matches the website palette in kinetic-kult/src/styles/variables.css
const COLORS = {
  black: "#050505",   // --kk-black
  ink: "#0a0a0a",     // near-black surface
  charcoal: "#1a1a1a",// dark text on light bg
  white: "#ffffff",   // --kk-white
  muted: "#a3a3a3",   // --kk-gray
  soft: "#f5f5f5",    // neutral light surface
  acid: "#d90429",    // --kk-red (accents)
  coral: "#d90429",   // --kk-red (highlights)
  line: "#262626",    // dark border
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const assertEmailSent = ({ data, error }, label) => {
  if (error) {
    throw error;
  }

  if (!data || !data.id) {
    throw new Error(`${label} email did not return a Resend email ID`);
  }

  console.log(`${label} email sent`);

  return data;
};

const sendWaitlistEmails = async ({
  name,
  email,
  size,
}) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSize = escapeHtml(size);

  const customerEmail = assertEmailSent(
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "You're in \u2014 KeneticKult DROP 001",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin: 0; padding: 0; background: ${COLORS.black}; color: ${COLORS.white}; font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 50px 25px;">
              <div style="height: 5px; background: ${COLORS.acid}; margin-bottom: 34px;"></div>

              <div style="font-size: 13px; font-weight: bold; letter-spacing: 4px; margin-bottom: 38px; color: ${COLORS.acid};">
                KENETICKULT
              </div>

              <div style="display: inline-block; padding: 8px 10px; font-size: 11px; letter-spacing: 3px; color: ${COLORS.black}; background: ${COLORS.acid}; margin-bottom: 22px; font-weight: bold;">
                DROP 001
              </div>

              <h1 style="margin: 0 0 25px; font-size: 48px; line-height: 0.95; color: ${COLORS.white};">
                YOU'RE<br>
                <span style="color: ${COLORS.coral};">IN.</span>
              </h1>

              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.7; color: ${COLORS.muted};">
                Hey ${safeName},
              </p>

              <p style="margin: 0; font-size: 16px; line-height: 1.7; color: ${COLORS.muted};">
                You're officially on the <strong style="color: ${COLORS.acid};">KeneticKult DROP 001</strong> waitlist.
              </p>

              <div style="margin: 35px 0; padding: 25px; background: ${COLORS.ink}; border: 1px solid ${COLORS.line}; border-left: 5px solid ${COLORS.coral};">
                <div style="margin-bottom: 20px; font-size: 10px; letter-spacing: 2px; color: ${COLORS.acid};">
                  YOUR DETAILS
                </div>

                <p style="margin: 10px 0; font-size: 14px; color: ${COLORS.white};">
                  <strong style="color: ${COLORS.soft};">Name:</strong> ${safeName}
                </p>

                <p style="margin: 10px 0; font-size: 14px; color: ${COLORS.white};">
                  <strong style="color: ${COLORS.soft};">Email:</strong> ${safeEmail}
                </p>

                <p style="margin: 10px 0; font-size: 14px; color: ${COLORS.white};">
                  <strong style="color: ${COLORS.soft};">Size:</strong> ${safeSize}
                </p>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: ${COLORS.muted};">
                We'll contact you when DROP 001 is ready.
              </p>

              <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid ${COLORS.line}; font-size: 10px; letter-spacing: 3px; color: ${COLORS.coral};">
                KENETICKULT
              </div>
            </div>
          </body>
        </html>
      `,
    }),
    "Customer"
  );

  const adminEmail = assertEmailSent(
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `New KeneticKult DROP 001 Entry \u2014 ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin: 0; padding: 40px; background: ${COLORS.soft}; color: ${COLORS.ink}; font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;">
            <div style="max-width: 650px; margin: 0 auto; background: ${COLORS.white}; border-top: 6px solid ${COLORS.acid}; padding: 32px; border-bottom: 6px solid ${COLORS.coral};">
            <div style="font-size: 12px; font-weight: bold; letter-spacing: 4px; color: ${COLORS.black}; margin-bottom: 22px;">
              KENETICKULT
            </div>

            <h1 style="margin-bottom: 10px; color: ${COLORS.black};">
              New KeneticKult DROP 001 Entry
            </h1>

            <p style="color: ${COLORS.charcoal};">
              A new customer has joined the KeneticKult waitlist.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid ${COLORS.line};">

            <h2 style="color: ${COLORS.coral};">
              Customer Details
            </h2>

            <table style="width: 100%; max-width: 550px; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: ${COLORS.black};">Name</td>
                <td style="padding: 12px 0;">${safeName}</td>
              </tr>

              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: ${COLORS.black};">Email</td>
                <td style="padding: 12px 0;">${safeEmail}</td>
              </tr>

              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: ${COLORS.black};">Size</td>
                <td style="padding: 12px 0;"><span style="display: inline-block; padding: 4px 9px; background: ${COLORS.acid}; color: ${COLORS.black}; font-weight: bold;">${safeSize}</span></td>
              </tr>
            </table>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid ${COLORS.line};">

            <p style="font-size: 13px; color: ${COLORS.charcoal};">
              This customer has been saved to <strong>clothing_waitlist</strong> in Supabase.
            </p>
            </div>
          </body>
        </html>
      `,
    }),
    "Admin"
  );

  return {
    customerEmail,
    adminEmail,
  };
};

module.exports = {
  sendWaitlistEmails,
};
