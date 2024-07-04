const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { PaymentModel } = require("../Models/PaymentModel"); // Ensure the correct path
const checkAuth = require("../MiddelWares/CheckAuth");
const { User } = require("../Models/user");
const checkAdmin = require("../MiddelWares/CheckAdmin");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  //cloudinary
  cloud_name: "dzuwpvydm",
  api_key: "669714923474566",
  api_secret: "wTt4h4lidYWvHyH_qDPXDLrz-7E",
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload",
  checkAuth({ redirect: false }),
  upload.single("file"),
  async (req, res) => {
    try {
      const username = req.user.username;
      const email = req.user.email;

      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        async (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ success: false, message: error.message });
          }

          const newPayment = new PaymentModel({
            username: username,
            email: email,
            url: result.secure_url,
            balance: req.body.balance || 0, // Assuming balance is provided in the request body
            address: req.body.address || "",
          });

          await newPayment.save();
          res.status(200).json({ success: true, url: result.secure_url });
        }
      );

      stream.end(req.file.buffer);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
router.get(
  "/get-payments",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const payments = await PaymentModel.find().lean();
      res.status(200).json({ payments });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Route to approve a payment
router.put(
  "/approve-payment/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.status !== "waiting") {
        return res
          .status(400)
          .json({ message: "Payment is not in a waiting state" });
      }

      // Find user by email and update their points
      const user = await User.findOne({ email: payment.email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.points += payment.balance;
      await user.save();

      // Update payment status
      payment.isActionDone = true;
      payment.status = "approved";
      await payment.save();

      res.status(200).json({ message: "Payment approved", payment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Route to decline a payment
router.put(
  "/decline-payment/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const payment = await PaymentModel.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.status !== "waiting") {
        return res
          .status(400)
          .json({ message: "Payment is not in a waiting state" });
      }

      // Update payment status
      payment.isActionDone = true;
      payment.status = "rejected";
      await payment.save();

      res.status(200).json({ message: "Payment declined", payment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;
