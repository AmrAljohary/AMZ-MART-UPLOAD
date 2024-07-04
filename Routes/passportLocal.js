const { User } = require("../Models/user");
const bcryptjs = require("bcryptjs");
const localStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");

module.exports = function (passport) {
  passport.use(
    new localStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // Check if Mongoose is connected
          if (mongoose.connection.readyState !== 1) {
            return done(null, false, { message: "Database connection error" });
          }

          const data = await User.findOne({ email: email });

          if (!data) {
            return done(null, false, { message: "User doesn't exist" });
          }

          const match = await bcryptjs.compare(password, data.password);

          if (!match) {
            return done(null, false, {
              message: "invalid credentials check your email and password",
            });
          }

          return done(null, data);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id, done) {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
