const mongoose = require("mongoose");

const CodeRequestSchema = new mongoose.Schema(
  {
    email: {
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

const CodeRequestModel = mongoose.model(
  "CodeRequest",
  CodeRequestSchema,
  "CodeRequest"
);

module.exports = { CodeRequestModel };
