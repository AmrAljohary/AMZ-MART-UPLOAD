const mongoose = require("mongoose");

const WithDrawSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    crypto: {
      type: String,
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

module.exports = mongoose.model("WithDraw", WithDrawSchema);
