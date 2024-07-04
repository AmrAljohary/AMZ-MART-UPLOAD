// routes/cryptoAddress.js
const express = require("express");
const CryptoAddress = require("../Models/Wallet");
const router = express.Router();

// GET all crypto addresses
router.get("/", async (req, res) => {
  try {
    const address = await CryptoAddress.findOne(); // Get the first document in the collection
    if (address) {
      res.status(200).json(address);
    } else {
      res.status(404).json({ error: "No address found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error fetching address" });
  }
});

// PUT to update an existing crypto address
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { user, address, type } = req.body;
  try {
    const updatedAddress = await CryptoAddress.findByIdAndUpdate(
      id,
      { user, address, type },
      { new: true }
    );
    if (!updatedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ error: "Error updating address" });
  }
});

module.exports = router;
