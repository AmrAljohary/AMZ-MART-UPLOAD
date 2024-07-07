const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const passport = require("passport");
const connectDB = require("./connectDb");

//env
const PORT = process.env.PORT;
const SECRET_KEY = process.env.SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV;
const mongoUrl = process.env.URL;
//Routes
const authRouter = require("./Routes/Auth");
const payRouter = require("./Routes/Payment");
const invitationRoutes = require("./Routes/InvitationCode");
const MissionRoutes = require("./Routes/Missions");
const UsersRoutes = require("./Routes/Users");
const StaticsRoutes = require("./Routes/Statics");
const WalletRoutes = require("./Routes/Wallet");
const WithDrawRoutes = require("./Routes/WithDraw");
// Initialize Express app
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://amz-mart.vercel.app",
      "https://amz-mart-dash.vercel.app",
      "https://6632-156-197-24-197.ngrok-free.app",
      "https://dash.aiword999.com",
      "https://aiword999.com",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(express.json({ limit: "100mb" })); // Adjust '10mb' as needed
app.use(express.urlencoded({ limit: "100mb", extended: true }));
mongoose.set("strictQuery", false);
connectDB();
app.use(cookieParser(SECRET_KEY));
if (NODE_ENV === "production") {
  app.set("trust proxy", 1);

  app.use(
    expressSession({
      secret: SECRET_KEY,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: true,
        sameSite: "none",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      },
      store: MongoStore.create({
        mongoUrl: mongoUrl,
        ttl: 365 * 24 * 60 * 60 * 1000,
        autoRemove: "native",
      }),
    })
  );
} else {
  app.use(
    expressSession({
      secret: SECRET_KEY,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: false,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      },
      store: MongoStore.create({
        mongoUrl: mongoUrl,
        ttl: 365 * 24 * 60 * 60 * 1000,
        autoRemove: "native",
      }),
    })
  );
}
app.use(passport.initialize());
app.use(passport.session());
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/auth", authRouter);
// app.use("/packages", packagesRouter);
app.use("/pay", payRouter);
app.use("/invitation", invitationRoutes);
app.use("/Mission", MissionRoutes);
app.use("/users", UsersRoutes);
app.use("/statics", StaticsRoutes);
app.use("/wallet", WalletRoutes);
app.use("/withdraw", WithDrawRoutes);
// Define port number

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
