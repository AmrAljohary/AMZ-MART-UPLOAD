const express = require("express");
const { CodeRequestModel } = require("../Models/CodeRequest");
const router = express.Router();
router.post("/code-request", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const codeRequest = new CodeRequestModel({ email });
    await codeRequest.save();
    res.status(201).json({ message: "Code request received", codeRequest });
  } catch (error) {
    res.status(500).json({ error: "Error receiving code request" });
  }
});

// Endpoint to accept a code request and send the code via email
router.post("/code-request/accept/:id", async (req, res) => {
  const { id } = req.params;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate a 6-character code

  try {
    const codeRequest = await CodeRequestModel.findById(id);
    if (!codeRequest) {
      return res.status(404).json({ error: "Code request not found" });
    }

    codeRequest.isActionDone = true;
    codeRequest.status = "approved";
    await codeRequest.save();

    sendEmail(codeRequest.email, "Your Code", `Your code is: ${code}`);
    res.status(200).json({ message: "Code request accepted and email sent" });
  } catch (error) {
    res.status(500).json({ error: "Error accepting code request" });
  }
});

// Endpoint to reject a code request and send a rejection email
router.post("/code-request/reject/:id", async (req, res) => {
  const { id } = req.params;
  const rejectionMessage = "Your code request has been rejected.";

  try {
    const codeRequest = await CodeRequestModel.findById(id);
    if (!codeRequest) {
      return res.status(404).json({ error: "Code request not found" });
    }

    codeRequest.isActionDone = true;
    codeRequest.status = "rejected";
    await codeRequest.save();

    sendEmail(codeRequest.email, "Code Request Rejected", rejectionMessage);
    res.status(200).json({ message: "Code request rejected and email sent" });
  } catch (error) {
    res.status(500).json({ error: "Error rejecting code request" });
  }
});
module.exports = router;
