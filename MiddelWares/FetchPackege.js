const mongoose = require("mongoose");

const fetchPackageMiddleware = async (req, res, next) => {
  // Assuming the resource ID is passed in the request body
  const packageId = req.body.packageId;
  const key = req.body.key;
  // Validate that the package model exists
  if (!mongoose.models["Package"]) {
    return res.status(400).json({ error: "Invalid resource name" });
  }

  // Assuming you have a Mongoose model for packages
  const Package = mongoose.model("Package");

  try {
    // Fetch the package data from the database based on the ID
    const packageData = await Package.findById(packageId);

    if (!packageData) {
      // If the package is not found, proceed to the next middleware
      return next();
    }

    // Attach the fetched package data to the request object
    req.fetchedPackage = packageData;
    req.key = key;

    // Continue to the next middleware
    next();
  } catch (error) {
    // Handle any errors that may occur during database query
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = fetchPackageMiddleware;
