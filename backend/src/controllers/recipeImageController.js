const RecipeImageModel = require('../models/recipeImageModel');
const RecipeModel = require('../models/recipeModel');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

class RecipeImageController {
  /**
   * Upload image(s) for a recipe
   * POST /api/recipes/:id/images
   */
  static uploadImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isHero } = req.body;

    // Verify recipe exists
    const recipe = await RecipeModel.getById(id);
    if (!recipe) {
      throw new ApiError(404, 'Recipe not found');
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No image files provided');
    }

    const uploadedImages = [];
    const isFirstImageHero = isHero === 'true' || isHero === true;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      // Determine if this image should be the hero
      // First image can be hero if specified, others are gallery images
      const shouldBeHero = i === 0 && isFirstImageHero;

      const imageData = {
        recipeId: parseInt(id, 10),
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        isHero: shouldBeHero,
        uploadedBy: req.user?.id || null
      };

      const createdImage = await RecipeImageModel.create(imageData);
      // Get sanitized version for response using the specific ID
      const sanitizedImage = await RecipeImageModel.getByIdPublic(createdImage.id);
      uploadedImages.push(sanitizedImage);
    }

    res.status(201).json({
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      images: uploadedImages
    });
  });

  /**
   * Get all images for a recipe
   * GET /api/recipes/:id/images
   */
  static getImages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify recipe exists
    const recipe = await RecipeModel.getById(id);
    if (!recipe) {
      throw new ApiError(404, 'Recipe not found');
    }

    // Use sanitized public method
    const images = await RecipeImageModel.getByRecipeIdPublic(id);

    res.json({ images });
  });

  /**
   * Set an image as the hero image
   * PUT /api/recipes/:recipeId/images/:imageId/hero
   */
  static setHeroImage = asyncHandler(async (req, res) => {
    const { recipeId, imageId } = req.params;

    // Verify recipe exists
    const recipe = await RecipeModel.getById(recipeId);
    if (!recipe) {
      throw new ApiError(404, 'Recipe not found');
    }

    // Verify image exists and belongs to this recipe
    const image = await RecipeImageModel.getById(imageId);
    if (!image || image.recipeId !== parseInt(recipeId, 10)) {
      throw new ApiError(404, 'Image not found for this recipe');
    }

    await RecipeImageModel.setAsHero(imageId, recipeId);
    // Return sanitized version
    const updatedImage = await RecipeImageModel.getByIdPublic(imageId);

    res.json({
      message: 'Hero image updated successfully',
      image: updatedImage
    });
  });

  /**
   * Delete an image
   * DELETE /api/recipes/:recipeId/images/:imageId
   */
  static deleteImage = asyncHandler(async (req, res) => {
    const { recipeId, imageId } = req.params;

    // Verify recipe exists
    const recipe = await RecipeModel.getById(recipeId);
    if (!recipe) {
      throw new ApiError(404, 'Recipe not found');
    }

    // Verify image exists and belongs to this recipe
    const image = await RecipeImageModel.getById(imageId);
    if (!image || image.recipeId !== parseInt(recipeId, 10)) {
      throw new ApiError(404, 'Image not found for this recipe');
    }

    const deleted = await RecipeImageModel.delete(imageId);

    if (!deleted) {
      throw new ApiError(500, 'Failed to delete image');
    }

    res.json({ message: 'Image deleted successfully' });
  });

  /**
   * Reorder images for a recipe
   * PUT /api/recipes/:id/images/reorder
   */
  static reorderImages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { imageOrder } = req.body;

    // Verify recipe exists
    const recipe = await RecipeModel.getById(id);
    if (!recipe) {
      throw new ApiError(404, 'Recipe not found');
    }

    if (!Array.isArray(imageOrder)) {
      throw new ApiError(400, 'imageOrder must be an array of image IDs');
    }

    // Validate all image IDs belong to this recipe
    const validIds = await RecipeImageModel.validateImageOwnership(id, imageOrder);
    if (!validIds) {
      throw new ApiError(400, 'One or more image IDs do not belong to this recipe');
    }

    // Update positions
    for (let position = 0; position < imageOrder.length; position++) {
      const imageId = imageOrder[position];
      await RecipeImageModel.updatePosition(imageId, position);
    }

    // Return sanitized images
    const images = await RecipeImageModel.getByRecipeIdPublic(id);

    res.json({
      message: 'Image order updated successfully',
      images
    });
  });
}

module.exports = RecipeImageController;
