const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    address: {
      type: String, // Assuming address should be a string type instead of a number
      default: "",
    },
    balance: {
      type: Number,
      required: true,
    },
    isActionDone: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["waiting", "approved", "rejected"],
      default: "waiting",
    },
  },

  { timestamps: true }
);

const PaymentModel = mongoose.model(
  "PaymentModel",
  PaymentSchema,
  "PaymentModel"
);

module.exports = { PaymentModel };
