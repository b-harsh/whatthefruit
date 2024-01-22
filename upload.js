const fs = require("fs");
const path = require("path");
const cloudinary = require("./config/cloudinary");
const imageFolderPath = "./public/images";

const uploadImagesToCloudinary = async () => {
  try {
    // Read all files from the images folder
    const files = await fs.promises.readdir(imageFolderPath);

    // Loop through each file and upload it to Cloudinary
    for (const file of files) {
      const filePath = path.join(imageFolderPath, file);
      try {
        // Specify the public_id as the file name (without extension)
        const publicId = path.basename(file, path.extname(file));
        const result = await cloudinary.uploader.upload(filePath, {
          public_id: publicId,
        });
        console.log(`${file} uploaded successfully:`, result);
      } catch (error) {
        console.error(`Error uploading ${file}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error reading directory:", error);
  }
};

uploadImagesToCloudinary();
