const {
  generateNewsletter,
} = require("../services/ai.service");

const createNewsletter = async (
  req,
  res,
  next
) => {
  try {
    const { topic } = req.body;

    if (typeof topic !== "string") {
      return res.status(400).json({
        success: false,
        message: "Topic is required",
      });
    }

    if (topic.trim().length === 0 || topic.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Topic must be between 1 and 200 characters.",
      });
    }

    const content =
      await generateNewsletter(topic);

    res.status(200).json({
      success: true,
      content,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNewsletter,
};