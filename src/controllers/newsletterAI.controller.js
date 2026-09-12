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

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "Topic is required",
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