const express = require("express");
const router = express.Router();
const InvitationCode = require("../Models/InvitationCode");
const { CodeRequestModel } = require("../Models/CodeRequest");
const { sendInvitationCode, sendRejectedCode } = require("../MiddelWares/SendMail");
const checkAdmin = require("../MiddelWares/CheckAdmin");

router.post(
  "/generate-invitation",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      let code;
      let existingCode;

      // Loop to generate a unique code
      do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        existingCode = await InvitationCode.findOne({ code });
      } while (existingCode);

      const newCode = new InvitationCode({ code });
      await newCode.save();

      res.status(201).json({ message: "Invitation code generated", code });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An internal server error occurred." });
    }
  }
);

router.get("/get-all", checkAdmin({ redirect: false }), async (req, res) => {
  try {
    const invitationCodes = await InvitationCode.find();
    res.status(200).json(invitationCodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
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
router.get(
  "/code-requests",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const codeRequests = await CodeRequestModel.find({});
      res.status(200).json({ codeRequests });
    } catch (error) {
      res.status(500).json({ error: "Error fetching code requests" });
    }
  }
);

// Endpoint to accept a code request and send the code via email
router.post(
  "/code-request/accept/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    const { id } = req.params;

    try {
      // Find the code request by ID
      const codeRequest = await CodeRequestModel.findById(id);
      if (!codeRequest) {
        return res.status(404).json({ error: "Code request not found" });
      }

      // Update the code request status
      codeRequest.isActionDone = true;
      codeRequest.status = "approved";
      await codeRequest.save();

      // Generate a unique invitation code
      let code;
      let existingCode;
      do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        existingCode = await InvitationCode.findOne({ code });
      } while (existingCode);

      // Save the new invitation code
      const newCode = new InvitationCode({ code });
      await newCode.save();

      // Send the invitation code via email
      await sendInvitationCode(codeRequest.email, code);

      res.status(200).json({ message: "Code request accepted and email sent" });
    } catch (error) {
      console.error("Error accepting code request:", error);
      res
        .status(500)
        .json({ error: "An error occurred while accepting the code request" });
    }
  }
);

// Endpoint to reject a code request and send a rejection email
router.post(
  "/code-request/reject/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    const { id } = req.params;
    const rejectionMessage =
      "Your code request for invitation code has been rejected.";

    try {
      // Find the code request by ID
      const codeRequest = await CodeRequestModel.findById(id);
      if (!codeRequest) {
        return res.status(404).json({ error: "Code request not found" });
      }

      // Update the code request status
      codeRequest.isActionDone = true;
      codeRequest.status = "rejected";
      await codeRequest.save();

      // Send the rejection email
      await sendRejectedCode(codeRequest.email, rejectionMessage);
      res.status(200).json({ message: "Code request rejected and email sent" });
    } catch (error) {
      console.error("Error rejecting code request:", error);
      res.status(500).json({ error: "Error rejecting code request" });
    }
  }
);
module.exports = router;
