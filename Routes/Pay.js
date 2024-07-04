const mongoose = require("mongoose");
const express = require("express");
const fetchPackageMiddleware = require("../MiddelWares/FetchPackege");
const { payMobMiddleware } = require("../MiddelWares/Pay");
const { User } = require("../Models/user");
const { verifyHmac } = require("../MiddelWares/Hmac");
const REDIRECT_URI = process.env.REDIRECT_URI;

const router = express.Router();
router.post(
  "/visa",
  fetchPackageMiddleware,
  payMobMiddleware,
  async (req, res) => {
    const pendingMessage =
      "Payment pending. We will notify you when it's complete.";
    res.json({
      pending: true,
      message: pendingMessage,
      paymentLink: req.paymentLink,
    });
  }
);

router.get("/callback/success", verifyHmac, (req, res) => {
  res.redirect(`${REDIRECT_URI}`);
});

router.post("/callback/success", async (req, res) => {
  try {
    const items = req.body.obj.order.items;

    // Iterate through each item in the items array
    for (const item of items) {
      const itemName = item.name;
      const itemAmountCents = item.amount_cents;

      // Output item details to console
      console.log("Item Name:", itemName);
      console.log("Item Amount (in cents):", itemAmountCents);

      // Search for the user in the user schema using the itemName
      const user = await User.findById(itemName);

      // If user not found, log an error and move to the next item
      if (!user) {
        console.error(`User with ID ${itemName} not found`);
        continue;
      }

      // Add itemAmountCents/100 to the user's wallet
      user.subscription = true;

      // Save the updated user document
      await user.save();
    }

    // Send a success response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
