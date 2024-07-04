const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { PaymentModel } = require("../Models/PaymentModel"); // Ensure the correct path
const checkAuth = require("../MiddelWares/CheckAuth");
const Mission = require("../Models/Misiion");
const { User } = require("../Models/user");
const checkAdmin = require("../MiddelWares/CheckAdmin");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  //cloudinary
  cloud_name: "dzuwpvydm",
  api_key: "669714923474566",
  api_secret: "wTt4h4lidYWvHyH_qDPXDLrz-7E",
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route to create a new mission with image upload
router.post(
  "/create",
  checkAdmin({ redirect: false }),
  upload.single("image"),
  async (req, res) => {
    try {
      // Check if image upload was successful
      if (!req.file) {
        return res.status(400).json({ message: "Please upload an image." });
      }

      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        async (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ success: false, message: error.message });
          }

          // Find the mission with the highest seq value
          const lastMission = await Mission.findOne().sort({ seq: -1 });

          // Determine the new seq value
          const newSeq = lastMission ? lastMission.seq + 1 : 1;

          // Create new mission with the next seq value
          const newMission = new Mission({
            name: req.body.name,
            price: req.body.price,
            quantity: req.body.quantity,
            image: result.secure_url, // Use req.file.path provided by multer-cloudinary storage
            commission: req.body.commission,
            expectedUSDT: req.body.expectedUSDT,
            status: req.body.status,
            isPending: req.body.isPending,
            isCompleted: req.body.isCompleted,
            seq: newSeq,
          });

          // Save new mission to database
          await newMission.save();

          // Return success response with created mission data
          res.status(201).json(newMission);
        }
      );
      stream.end(req.file.buffer);
    } catch (error) {
      // Handle errors during mission creation or image upload
      console.error("Error creating mission:", error);
      res
        .status(500)
        .json({ message: "Failed to create mission.", error: error.message });
    }
  }
);

// Get all Missions
router.get("/get-All", checkAdmin({ redirect: false }), async (req, res) => {
  try {
    const Missions = await Mission.find();
    res.status(200).json(Missions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// user mission
router.get(
  "/get-user-missions",
  checkAuth({ redirect: false }),
  async (req, res) => {
    try {
      // Check if user is authenticated and retrieve missions
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user._id;

      // Find user by userId and populate missions
      let user = await User.findById(userId).populate("missions.mission");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if all missions are completed
      if (user.missionsDone === true) {
        // Prepare completed missions data
        const missionsList = await Mission.find()
          .sort({ seq: 1 })
          .select("_id");
        const completedMissionIds = missionsList.map((mission) => mission._id);
        const completedMissions = await Mission.find({
          _id: { $in: completedMissionIds },
        }).lean();

        // Add isPending and isCompleted properties to the completed missions
        const populatedCompletedMissions = completedMissions.map((mission) => ({
          mission,
          isPending: false,
          isCompleted: true,
        }));

        return res.status(200).json({
          message: "You have completed all missions",
          missions: user.missions,
          totalMissionsCount: missionsList.length,
          currentMissionIndex: missionsList.length,
          completedMissions: populatedCompletedMissions,
        });
      }

      // Fetch total number of missions in the database
      const totalMissionsCount = await Mission.countDocuments();

      // If user has no missions or the first mission is deleted/not found
      if (user.missions.length === 0 || !user.missions[0].mission) {
        const firstMission = await Mission.findOne().sort({ seq: 1 });
        if (!firstMission) {
          return res.status(404).json({ message: "No missions available" });
        }

        // Create mission assignment
        const missionAssignment = {
          mission: firstMission._id,
          isPending: true,
          isCompleted: false,
        };

        // Assign mission to user and save
        user.missions = [missionAssignment]; // Set missions array with the new assignment
        await user.save();

        // Populate the newly added mission
        user = await User.findById(userId).populate("missions.mission");
      }

      // Get the current mission assigned to the user
      const currentMissionSeq = user.missions[0].mission.seq;

      // Determine the completed missions
      const completedMissions = await Mission.find({
        seq: { $lt: currentMissionSeq },
      }).lean();

      // Add isPending and isCompleted properties to the completed missions
      const populatedCompletedMissions = completedMissions.map((mission) => ({
        mission,
        isPending: false,
        isCompleted: true,
      }));

      // Return user's missions, total count, current mission index, and populated completed missions
      res.status(200).json({
        missions: user.missions,
        totalMissionsCount,
        currentMissionIndex: currentMissionSeq,
        completedMissions: populatedCompletedMissions,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/submit-mission",
  checkAuth({ redirect: false }),
  async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Retrieve user details from req.user
      const userId = req.user._id;

      // Find user by userId and populate missions
      const user = await User.findById(userId).populate("missions.mission");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find the current mission assigned to the user
      const currentMission = user.missions.find(
        (m) => m.isPending && !m.isCompleted
      );
      if (!currentMission) {
        return res.status(404).json({ message: "No pending mission found" });
      }

      // Find the mission details from Mission collection
      const mission = await Mission.findById(currentMission.mission);
      if (!mission) {
        return res.status(404).json({ message: "Mission details not found" });
      }

      // Check if user has enough points to deduct the mission price
      if (user.points < mission.price) {
        return res.status(403).json({ message: "Insufficient points" });
      }

      // Deduct mission price from user's points
      user.points -= mission.price;
      console.log(mission.expectedUSDT);
      user.FrozenPoints += parseInt(mission.expectedUSDT);
      // Find the next mission in the sequence
      const nextMission = await Mission.findOne({
        _id: { $gt: mission._id },
      }).sort({ _id: 1 });

      if (!nextMission) {
        // Set missionsDone to true and empty the missions array
        user.missions = [];
        user.missionsDone = true;
      } else {
        // Update user's missions array with the next mission ID
        currentMission.mission = nextMission._id;
      }

      // Save updated user
      await user.save();

      // Return success message
      res.status(200).json({ message: "Mission submitted successfully" });
    } catch (error) {
      console.error("Error submitting mission:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Get a Mission by ID
router.get(
  "/Missions/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const Mission = await Mission.findById(req.params.id);
      if (!Mission) {
        return res.status(404).json({ message: "Mission not found" });
      }
      res.status(200).json(Mission);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Update a Mission by ID
router.put(
  "/missions/:id",
  checkAdmin({ redirect: false }),
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = req.body.image; // Default to existing image URL

      // Check if a new image file was uploaded
      if (req.file) {
        // Upload image to Cloudinary
        const imageResult = await cloudinary.uploader.upload(req.file.path);

        // Delete local file after uploading to Cloudinary
        fs.unlinkSync(req.file.path);

        // Get the Cloudinary URL for the uploaded image
        imageUrl = imageResult.secure_url;
      }

      // Update mission data based on request body
      const updatedMission = await Mission.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          price: req.body.price,
          quantity: req.body.quantity,
          image: imageUrl,
          commission: req.body.commission,
          expectedUSDT: req.body.expectedUSDT,
          status: req.body.status,
          isPending: req.body.isPending,
          isCompleted: req.body.isCompleted,
        },
        { new: true }
      );

      if (!updatedMission) {
        return res.status(404).json({ message: "Mission not found" });
      }

      res.status(200).json(updatedMission);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete a Mission by ID
router.delete(
  "/Missions/:id",
  checkAdmin({ redirect: false }),
  async (req, res) => {
    try {
      const deletedMission = await Mission.findByIdAndDelete(req.params.id);
      if (!deletedMission) {
        return res.status(404).json({ message: "Mission not found" });
      }
      res.status(200).json({ message: "Mission deleted" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;
