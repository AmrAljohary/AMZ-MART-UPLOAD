const mongoose = require("mongoose");
const Mission = require("./Models/Misiion");
const mongoURI =
  "mongodb+srv://amr200979:amr2329982587@cluster0.jey9vh0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // Replace with your actual MongoDB URI
// Sample data for missions
const missionsData = [];
for (let i = 1; i <= 25; i++) {
  missionsData.push({
    name: `Mission ${i}`,
    price: `${Math.floor(Math.random() * 100) + 1}`, // Random price between 1 and 100
    quantity: Math.floor(Math.random() * 10) + 1, // Random quantity between 1 and 10
    image: `https://res.cloudinary.com/dzuwpvydm/image/upload/v1719298039/qqq1pewesh8qhpdpaltq.png`, // Replace with actual image URLs
    commission: `${Math.floor(Math.random() * 10) + 1}`, // Random commission between 1 and 10
    expectedUSDT: `${Math.floor(Math.random() * 100) + 1}`, // Random expected USDT between 1 and 100
    seq: `${i}`,
  });
}

async function insertPackages() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const insertedPackages = await Mission.insertMany(missionsData);
    console.log("Packages inserted:", insertedPackages);
  } catch (error) {
    console.error("Error inserting packages:", error);
  } finally {
    mongoose.disconnect();
  }
}

insertPackages();
