const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Upload image to Cloudinary
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'profile_images', // Optional: organize images in a folder
      resource_type: 'auto',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    // Delete local file after successful upload
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
      // Continue even if file deletion fails
    }

    // Return Cloudinary URL
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id
      }
    });

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Delete local file if upload failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting local file after failed upload:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading image to Cloudinary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadImage
};

