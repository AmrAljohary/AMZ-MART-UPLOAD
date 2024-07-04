const mongoose = require("mongoose");

const invitationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, 
  },
});

const InvitationCode = mongoose.model("InvitationCode", invitationCodeSchema);

module.exports = InvitationCode;
