const mongoose = require("mongoose");
const { Schema } = mongoose;

const cryptoAddressSchema = new Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CryptoAddress = mongoose.model("CryptoAddress", cryptoAddressSchema);
module.exports = CryptoAddress;
