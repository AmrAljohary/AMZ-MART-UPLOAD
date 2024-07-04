const express = require("express");
const router = express.Router();
const { User } = require("../Models/user");
const checkAuth = require("../MiddelWares/CheckAuth");
const checkAdmin = require("../MiddelWares/CheckAdmin");

// Route to get all users
router.get("/get-users", checkAdmin({ redirect: false }), async (req, res) => {
  try {
    // Fetch users with pagination, excluding password and missions fields
    const users = await User.find()
      .select("-password -missions") // Exclude password and missions fields
      .lean();

    // Return the list of users
    res.status(200).json({ users });
  } catch (error) {
    // Handle any errors
    res.status(500).json({ message: error.message });
  }
});
router.get(
  "/getfrozenusers",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      // Fetch users with points equal to 0 and FrozenPoints not equal to 0, excluding password and missions fields
      const users = await User.find({ points: 0, FrozenPoints: { $ne: 0 } })
        .select("-password -missions") // Exclude password and missions fields
        .lean();

      // Return the list of filtered users
      res.status(200).json({ users });
    } catch (error) {
      // Handle any errors
      res.status(500).json({ message: error.message });
    }
  }
);
router.post(
  "/transfer-frozen-points/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if userId is provided
      if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
      }

      // Find the user by ID
      const user = await User.findById(userId);

      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Check if user has FrozenPoints
      if (user.FrozenPoints === 0) {
        return res
          .status(400)
          .json({ message: "User has no Frozen Balance to transfer." });
      }

      // Update the user: transfer FrozenPoints to points and set FrozenPoints to 0
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            points: user.points + user.FrozenPoints,
            FrozenPoints: 0,
          },
        },
        { new: true } // Return the updated document
      );

      // Return success response with updated user data
      res.status(200).json({
        message: "Frozen Balance transferred to Balance successfully.",
        user: updatedUser,
      });
    } catch (error) {
      // Handle any errors
      console.error("Error transferring Frozen Balance:", error);
      res.status(500).json({
        message: "Failed to transfer Frozen Balance.",
        error: error.message,
      });
    }
  }
);
// Route to edit a user
router.put(
  "/edit-user/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;

      // Exclude password and missions fields from being updated
      delete updateData.password;
      delete updateData.missions;

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password -missions"); // Exclude password and missions fields from response

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      // Handle any errors
      res.status(500).json({ message: error.message });
    }
  }
);

// Route to delete a user
router.delete(
  "/delete-user/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const userId = req.params.id;

      const deletedUser = await User.findByIdAndDelete(userId).select(
        "-password -missions"
      ); // Exclude password and missions fields from response

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res
        .status(200)
        .json({ message: "User deleted successfully", user: deletedUser });
    } catch (error) {
      // Handle any errors
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
