const express = require("express");

const {
  createNewsletter,
} = require("../controllers/newsletterAI.controller");

const router = express.Router();

router.post(
  "/generate",
  createNewsletter
);

module.exports = router;