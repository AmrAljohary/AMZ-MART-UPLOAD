const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  commission: {
    type: String,
    required: true,
  },
  expectedUSDT: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    required: true,
  },
});

const Mission = mongoose.model("mission", missionSchema);

module.exports = Mission;
