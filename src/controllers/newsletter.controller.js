const {
  createSubscriber,
} = require("../services/newsletter.service");

const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const subscriber =
      await createSubscriber(email);

    res.status(201).json({
      success: true,
      data: subscriber,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
};
