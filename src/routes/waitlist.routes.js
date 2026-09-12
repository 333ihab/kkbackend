const express = require("express");

const {
  createWaitlist,
} = require("../controllers/waitlist.controller");

const router = express.Router();

router.post("/", createWaitlist);

module.exports = router;