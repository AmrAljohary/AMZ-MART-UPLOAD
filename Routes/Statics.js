const express = require("express");
const { User } = require("../Models/user");
const Mission = require("../Models/Misiion");
const router = express.Router();
const mongoose = require("mongoose");
const { PaymentModel } = require("../Models/PaymentModel");
const InvitationCode = require("../Models/InvitationCode");
const { CodeRequestModel } = require("../Models/CodeRequest");
const checkAdmin = require("../MiddelWares/CheckAdmin");

router.get("/counts",checkAdmin({ redirect: false }), async (req, res) => {
  try {
    const CodeRequestModelCount = await CodeRequestModel.countDocuments();
    const InvitationCodeCount = await InvitationCode.countDocuments();
    const missionCount = await Mission.countDocuments();
    const Paymentcount = await PaymentModel.countDocuments();
    const userCount = await User.countDocuments();
    const sessionCount = await mongoose.connection.db
      .collection("sessions")
      .countDocuments();
    res.json({
      CodeRequestModelCount,
      InvitationCodeCount,
      missionCount,
      Paymentcount,
      userCount,
      sessionCount,
    });
  } catch (error) {
    console.error("Error fetching counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
