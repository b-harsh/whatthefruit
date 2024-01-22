require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// Replace 'YOUR_CLOUD_NAME', 'YOUR_API_KEY', and 'YOUR_API_SECRET' with your actual credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to check if Cloudinary is connected properly
const checkCloudinaryConnection = async () => {
  try {
    const accountDetails = await cloudinary.api.resource("sample", {
      type: "upload",
    });
    console.log(
      "Cloudinary connection successful. Account details:",
      accountDetails
    );
  } catch (error) {
    console.error("Error connecting to Cloudinary:", error.message);
  }
};

// Call the function to check the connection
checkCloudinaryConnection();

module.exports = cloudinary;
