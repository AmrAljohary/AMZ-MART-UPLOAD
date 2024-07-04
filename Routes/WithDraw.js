const express = require("express");
const router = express.Router();
const { User } = require("../Models/user");
const WithDraw = require("../Models/WithDraw");
const checkAuth = require("../MiddelWares/CheckAuth");
const bcryptjs = require("bcryptjs");
const checkAdmin = require("../MiddelWares/CheckAdmin");

// Route to submit a new withdrawal request
router.post("/submit", checkAuth({ redirect: false }), async (req, res) => {
  try {
    const { amount, address, password, crypto } = req.body;
    const email = req.user.email;
    const name = req.user.username;

    // Verify the user's password
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Your password isn't correct" });
    }

    // Check if the user has enough points
    const withdrawalAmount = parseFloat(amount);
    if (user.points < withdrawalAmount) {
      return res
        .status(400)
        .json({ message: "Insufficient points for withdrawal" });
    }

    const newWithdraw = new WithDraw({
      email,
      name,
      amount,
      address,
      crypto,
    });

    await newWithdraw.save();
    res
      .status(201)
      .json({ message: "Withdrawal request submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Route to get all withdrawal requests
router.get("/", checkAdmin({ redirect: false }), async (req, res) => {
  try {
    const withdrawals = await WithDraw.find();
    res.status(200).json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to approve a withdrawal request
router.post(
  "/approve/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const withdrawal = await WithDraw.findById(req.params.id);
      if (!withdrawal) {
        return res
          .status(404)
          .json({ message: "Withdrawal request not found" });
      }

      const user = await User.findOne({ email: withdrawal.email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const withdrawalAmount = parseInt(withdrawal.amount);
      if (user.points < withdrawalAmount) {
        return res
          .status(400)
          .json({ message: "User does not have enough points" });
      }

      // Deduct points from the user's account
      user.points -= withdrawalAmount;
      await user.save();

      // Update withdrawal status
      withdrawal.status = "approved";
      withdrawal.isActionDone = true;

      await withdrawal.save();
      res
        .status(200)
        .json({ message: "Withdrawal request approved successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Route to reject a withdrawal request
router.post(
  "/reject/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const withdrawal = await WithDraw.findById(req.params.id);
      if (!withdrawal) {
        return res
          .status(404)
          .json({ message: "Withdrawal request not found" });
      }

      withdrawal.status = "rejected";
      withdrawal.isActionDone = true;

      await withdrawal.save();
      res
        .status(200)
        .json({ message: "Withdrawal request rejected successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
