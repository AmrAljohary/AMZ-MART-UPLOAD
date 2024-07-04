const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const passport = require("passport");
const validator = require("validator");
const { User } = require("../Models/user");
require("./passportLocal.js")(passport);
const crypto = require("crypto");

// require("./googleAuth")(passport);
// require("./facebookAuth")(passport);
// const userRoutes = require("./accountRoutes");
// const HandelValidation = require("../middleWare/handelValidation");
// const { userRegistrationValidation } = require("../validation/signup");
const checkAuth = require("../MiddelWares/CheckAuth.js");
const VerifyTokens = require("../Models/VerifyTokens.js");
const mailer = require("../MiddelWares/SendMail.js");
const ResetTokens = require("../MiddelWares/ResetTokens.js");
const InvitationCode = require("../Models/InvitationCode.js");

// const { logger, responseLoggerMiddleware } = require("../middleWare/logger");
// const ActiveSession = require("../model/activeSesionModel");
// const SessionDelOTP = require("../model/sessionDelOTPModel");
// const Role = require("../model/roleModel");

const cloud_name = process.env.cloud_name;
const api_key = process.env.api_key;
const api_secret = process.env.api_secret;
const mongoUrl = process.env.URL;
// cloudinary.config({
//   cloud_name: cloud_name,
//   api_key: api_key,
//   api_secret: api_secret,
// });

const OTP_EXPIRATION_TIME = 10 * 60 * 1000;
const MAX_DAILY_ATTEMPTS = 10;
const MAX_WEEKLY_ATTEMPTS = 20;
const MAX_MONTHLY_ATTEMPTS = 50;
const MAX_ATTEMPTS_PER_HOUR = 5;
const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds in a day
const ONE_WEEK = 7 * ONE_DAY; // milliseconds in a week
const ONE_MONTH = 30 * ONE_DAY; // milliseconds in a month
const ONE_HOUR = 60 * 1000; // milliseconds in an hour;
function formatRemainingTime(remainingTime) {
  const seconds = Math.floor(remainingTime / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const formattedTime = `${hours}h:${minutes}m:${seconds % 60}s`;
  return formattedTime;
}

router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      logged: true,
    });
  } else {
    res.json({ logged: false });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    try {
      if (err) {
        console.error("Error during authentication:", err);
        return res
          .status(500)
          .json({ message: "Internal server error. Please try again later." });
      }

      if (!user) {
        // Generic error message to avoid revealing specific details
        return res.status(401).json({
          message:
            info.message ||
            "Authentication failed. Please check your email and password.",
        });
      }

      req.logIn(user, async (err) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({
            message: "Authentication failed. Please try again later.",
          });
        }
        return res.status(200).json({ message: "Login successful" });
      });
    } catch (err) {
      console.error("Exception during authentication:", err);
      return res
        .status(500)
        .json({ message: "Internal server error. Please try again later." });
    }
  })(req, res, next);
});
router.post("/admin/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    try {
      if (err) {
        console.error("Error during authentication:", err);
        return res.status(500).json({
          message: "Internal server error. Please try again later.",
        });
      }

      if (!user) {
        return res.status(401).json({
          message: info.message || "Authentication failed.",
        });
      }

      // Perform additional check if user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({
          message: "You are not authorized to access this page.",
        });
      }

      req.logIn(user, async (err) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({
            message: "Authentication failed. Please try again later.",
          });
        }

        // Manually save the session before sending the response
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({
              message: "Failed to save session.",
            });
          }

          // Extract the connect.sid cookie value
          const cookies = req.headers.cookie;
          let connectSidCookie;
          if (cookies) {
            const cookieArray = cookies.split(";");
            connectSidCookie = cookieArray.find((cookie) =>
              cookie.trim().startsWith("connect.sid=")
            );
          }

          if (connectSidCookie) {
            const connectSid = connectSidCookie.split("=")[1];

            res.cookie("connect.sid", connectSid, {
              httpOnly: true,
              secure: true, // Use true if your app is served over HTTPS
              sameSite: "None", // Adjust this according to your needs
            });

            return res.status(200).json({
              message: "Login successful",
              token: connectSid,
            });
          } else {
            return res.status(200).json({
              message: "Failed to retrieve session cookie.",
            });
          }
        });
      });
    } catch (err) {
      console.error("Exception during authentication:", err);
      return res.status(500).json({
        message: "Internal server error. Please try again later.",
      });
    }
  })(req, res, next);
});

router.post("/signup", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    invitationCode,
  } = req.body;

  try {
    // Basic validations
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !invitationCode
    ) {
      return res
        .status(400)
        .json({ error: "All fields are required, including invitation code." });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Validate password length or complexity (example: at least 6 characters)
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    // Combine firstName and lastName to create username
    const username = `${firstName}_${lastName}`.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists." });
    }

    // Check if invitation code is valid
    const validInvitation = await InvitationCode.findOne({
      code: invitationCode,
    });
    if (!validInvitation) {
      return res
        .status(400)
        .json({ error: "Invalid or expired invitation code." });
    }

    // Hash the password
    const salt = await bcryptjs.genSalt(12);
    const hash = await bcryptjs.hash(password, salt);

    // Create new user
    const userData = {
      username,
      email,
      password: hash,
      invitationCode: invitationCode,
    };

    await User.create(userData);

    // Delete the invitation code after use
    await InvitationCode.deleteOne({ code: invitationCode });

    res.status(200).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

router.get(
  "/send-verification-email",
  checkAuth({ redirect: false }),
  async (req, res) => {
    if (req.user.isVerified) {
      res.json({ message: "You are verified back to profile" });
    } else {
      const token = Math.floor(100000 + Math.random() * 900000);
      await VerifyTokens({ token: token, email: req.user.email }).save();
      mailer.sendVerifyEmail(req.user.email, req.user.username, token);
      res.json({
        message: "Verification email sent successfully",
        username: req.user.username,
        verified: req.user.isVerified,
        emailsent: true,
      });
    }
  }
);

router.get("/verifyemail", checkAuth({ redirect: false }), async (req, res) => {
  const token = req.query.token;
  const userEmail = req.user.email; // Get the email from authenticated user

  if (!token) {
    return res.status(400).json({
      message: "Token not provided",
    });
  }

  try {
    // Find the verification token in the database
    const verifyToken = await VerifyTokens.findOne({ token });

    if (!verifyToken) {
      return res.status(400).json({
        message: "Invalid token or Token has expired, Try again.",
      });
    }

    // Check if the email associated with the token matches the authenticated user's email
    if (verifyToken.email !== userEmail) {
      return res.status(403).json({
        message: "Unauthorized. Token does not match authenticated user.",
      });
    }

    // Find the user by email and update isVerified status
    const userData = await User.findOne({ email: verifyToken.email });

    if (!userData) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    userData.isVerified = true;
    await userData.save();

    // Delete the used verification token
    await VerifyTokens.findOneAndDelete({ token });

    // Respond with success message and user data
    res.json({
      message: "Email verified successfully",
      username: userData.username,
      verified: userData.isVerified,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({
      message: "Internal server error. Please try again later.",
    });
  }
});

router.get("/logout", checkAuth({ redirect: false }), async (req, res) => {
  // Delete active session from the database
  //   await ActiveSession.deleteOne({ userId });

  // Log the user out
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error while logging out" });
    }

    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error while destroying session" });
      }

      res.status(200).json({ message: "Logout successful." });
    });
  });
});

router.get("/profile", checkAuth({ redirect: false }), async (req, res) => {
  try {
    const userData = await User.findById(req.user._id);

    // .select("-password")
    // .populate("todos")
    // .populate({
    //   path: "details.country",
    //   model: "country",
    // })
    // .populate({
    //   path: "details.stage",
    //   model: "stage",
    // })
    // .populate({
    //   path: "details.stageSection",
    //   model: "stageSection",
    // })
    // .populate({
    //   path: "details.stageYear",
    //   model: "stageYear",
    // })
    // .exec();

    res.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Update user data
const allowedFields = ["username", "image", "role", "details"];

router.put("/user/edit", checkAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedUserData = req.body;

    // Check if the user's provider is not 'email'
    if (req.user.provider !== "email") {
      return res.status(403).json({
        message: "User's provider does not allow data modification.",
      });
    }

    // Filter out fields that are not allowed
    for (const key in updatedUserData) {
      if (!allowedFields.includes(key)) {
        return res.status(500).json({ message: `Invalid field: ${key}` });
      }
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

const updateUser = async (userId, updatedUserData, res) => {
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Update user data
  for (const key in updatedUserData) {
    user[key] = updatedUserData[key];
  }

  const updatedUser = await user.save();

  // Do not include password in the response
  updatedUser.password = undefined;

  res
    .status(200)
    .json({ message: "User data updated successfully", user: updatedUser });
};

// Change password
router.put(
  "/changePassword",
  checkAuth({ redirect: false }),
  async (req, res) => {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user._id;
      const user = await User.findById(userId);

      // Verify the old password
      const isMatch = await bcryptjs.compare(oldPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Old password does not match." });
      }
      // Check if newPassword and confirmPassword match
      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .json({ message: "New password and confirm password do not match." });
      }

      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Update the password
      const salt = await bcryptjs.genSalt(12);
      const hash = await bcryptjs.hash(newPassword, salt);
      user.password = hash;

      await user.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  }
);

router.post("/forget-password", async (req, res) => {
  const { email } = req.body;

  // Check if email is empty
  if (!email) {
    res.status(400).json({
      message: "Email is required.",
    });
    return;
  }

  const userData = await User.findOne({ email: email });

  if (userData) {
    // Check if there is an existing OTP for the email
    const existingOTP = await ResetTokens.findOne({ email: email });

    if (existingOTP) {
      const currentTime = Date.now();
      const lastAttemptTime = existingOTP.lastAttemptTime.getTime(); // Convert to milliseconds

      // Check if the user has reached the maximum number of attempts in an hour
      if (
        existingOTP.attempts >= MAX_ATTEMPTS_PER_HOUR &&
        currentTime - lastAttemptTime < ONE_HOUR
      ) {
        const remainingTime = ONE_HOUR - (currentTime - lastAttemptTime);
        const formattedTime = formatRemainingTime(remainingTime);
        res.status(400).json({
          message: `Maximum attempts reached in an hour. Try again in ${formattedTime}.`,
          remainingAttempts: MAX_ATTEMPTS_PER_HOUR - existingOTP.attempts,
        });
        return;
      }

      // Check if the user has reached the maximum number of attempts in a day
      if (
        existingOTP.attempts >= MAX_DAILY_ATTEMPTS &&
        currentTime - lastAttemptTime < ONE_DAY
      ) {
        const remainingTime = ONE_DAY - (currentTime - lastAttemptTime);
        const formattedTime = formatRemainingTime(remainingTime);
        res.status(400).json({
          message: `Maximum daily attempts reached. Try again in ${formattedTime}.`,
          remainingAttempts: MAX_DAILY_ATTEMPTS - existingOTP.attempts,
        });
        return;
      }

      // Check if the user has reached the maximum number of attempts in a week
      if (
        existingOTP.attempts >= MAX_WEEKLY_ATTEMPTS &&
        currentTime - lastAttemptTime < ONE_WEEK
      ) {
        const remainingTime = ONE_WEEK - (currentTime - lastAttemptTime);
        const formattedTime = formatRemainingTime(remainingTime);
        res.status(400).json({
          message: `Maximum weekly attempts reached. Try again in ${formattedTime}.`,
          remainingAttempts: MAX_WEEKLY_ATTEMPTS - existingOTP.attempts,
        });
        return;
      }

      // Check if the user has reached the maximum number of attempts in a month
      if (
        existingOTP.attempts >= MAX_MONTHLY_ATTEMPTS &&
        currentTime - lastAttemptTime < ONE_MONTH
      ) {
        const remainingTime = ONE_MONTH - (currentTime - lastAttemptTime);
        const formattedTime = formatRemainingTime(remainingTime);
        res.status(400).json({
          message: `Maximum monthly attempts reached. Try again in ${formattedTime}.`,
          remainingAttempts: MAX_MONTHLY_ATTEMPTS - existingOTP.attempts,
        });
        return;
      }

      // If the user is within the allowed limits, update the existingOTP document
      existingOTP.otp = Math.floor(100000 + Math.random() * 900000);
      existingOTP.otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);
      existingOTP.created = new Date();
      existingOTP.expire_at = new Date(Date.now() + OTP_EXPIRATION_TIME);
      existingOTP.attempts += 1;
      existingOTP.lastAttemptTime = new Date();

      await existingOTP.save();

      // send OTP in the email for verification
      mailer.sendResetOTP(email, existingOTP.otp);

      res.status(200).json({
        message: "Reset OTP sent. Check your email for more info.",
        remainingAttempts: MAX_ATTEMPTS_PER_HOUR - existingOTP.attempts,
      });
    } else {
      // Create a new OTP and save it in the collection
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);
      const newResetToken = new ResetTokens({
        otp: otp,
        otpExpiration: otpExpiration,
        email: email,
        attempts: 1,
        lastAttemptTime: Date.now(),
        created: new Date(), // Set the created time for the new OTP
        expire_at: new Date(Date.now() + OTP_EXPIRATION_TIME), // Set the expire time for the new OTP
      });

      await newResetToken.save();

      // send OTP in the email for verification
      mailer.sendResetOTP(email, otp);

      res.status(200).json({
        message: "Reset OTP sent. Check your email for more info.",
      });
    }
  } else {
    res.status(400).json({
      message: "No user exists with this email.",
    });
  }
});
router.get("/reset-password", async (req, res) => {
  const otp = req.query.otp;
  console.log(otp);

  if (!otp) {
    return res.status(400).json({
      message:
        "OTP not provided. Please enter the OTP you received in your email.",
    });
  }

  const currentTime = Date.now(); // Get the current date and time as a timestamp (number)
  console.log(currentTime);

  const check = await ResetTokens.findOne({
    otp: otp,
  });

  if (check) {
    const otpExpirationTime = new Date(check.expire_at).getTime(); // Convert the string to a timestamp (number)
    console.log(otpExpirationTime);

    if (otpExpirationTime > currentTime) {
      // OTP verified and not expired
      // send forgot-password page with reset to true
      // this will render the form to reset password
      // sending email too to grab email later
      return res.json({
        reset: true,
        email: check.email,
        msg: "Valid OTP. Proceed to reset password.",
      });
    } else {
      return res.status(400).json({
        message: "Invalid OTP or OTP has expired. Please request a new OTP.",
      });
    }
  } else {
    return res.status(400).json({
      message: "Invalid OTP. Please check the OTP and try again.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const { password, confirmpassword, email } = req.body;

  if (!email) {
    return res.status(400).json({
      reset: false,
      err: "Email not provided.",
    });
  }

  if (!password) {
    return res.status(400).json({
      reset: false,
      err: "Password not provided.",
    });
  }

  // Find the user by email
  const userData = await User.findOne({ email: email });

  // Check if the user has a valid OTP and OTP is not expired
  const validOTP = await ResetTokens.findOne({
    otp: req.query.otp,
  });

  if (!validOTP || validOTP.email !== email) {
    return res.status(400).json({
      reset: false,
      err: "Invalid OTP for the provided email. Please request a new OTP.",
    });
  }

  if (!userData) {
    return res.status(400).json({
      reset: false,
      err: "User not found.",
    });
  }

  const currentTime = Date.now();
  const otpExpirationTime = new Date(validOTP.expire_at).getTime();

  if (otpExpirationTime <= currentTime) {
    return res.status(400).json({
      reset: false,
      err: "Invalid OTP or OTP has expired. Please request a new OTP.",
    });
  }

  if (password !== confirmpassword) {
    return res.status(400).json({
      reset: true,
      err: "Passwords do not match. Please try again.",
      email: email,
    });
  }

  // OTP verified and not expired
  // Encrypt the new password and update the user's password in the database
  const salt = await bcryptjs.genSalt(12);
  if (salt) {
    const hash = await bcryptjs.hash(password, salt);
    await User.findOneAndUpdate({ email: email }, { $set: { password: hash } });

    // Delete the OTP from the database as it has been used
    await ResetTokens.findOneAndDelete({ otp: req.query.otp });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } else {
    return res.status(500).json({
      reset: true,
      err: "Unexpected Error, Please try again.",
      email: email,
    });
  }
});
// router.use(userRoutes);

module.exports = router;
