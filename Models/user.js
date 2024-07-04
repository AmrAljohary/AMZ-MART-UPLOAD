const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  points: {
    type: Number,
    default: 0,
  },
  FrozenPoints: {
    type: Number,
    default: 0,
  },
  invitationCode: {
    type: Number,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  missionsDone: {
    type: Boolean,
    default: false,
  },
  missions: [
    {
      mission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "mission",
      },
      isPending: {
        type: Boolean,
        default: true,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
    },
  ],
});
const User = mongoose.model("user", userSchema, "user");

module.exports = { User };
