const path = require('path');
const FileModel = require('../models/fileModel');
const PendingRecipeModel = require('../models/pendingRecipeModel');
const PDFParser = require('../services/pdfParser');
const AIService = require('../services/aiService');
const UrlScraper = require('../services/urlScraper');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { UPLOAD_DIRS } = require('../middleware/upload');

/**
 * Upload PDF and parse recipe
 * POST /api/admin/upload-pdf
 */
exports.uploadAndParse = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No PDF file uploaded');
  }

  const file = req.file;
  const userId = req.user.id;

  try {
    // 1. Save file record to database
    const fileId = await FileModel.create({
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: userId
    });

    // 2. Extract text from PDF
    let rawText;
    try {
      rawText = await PDFParser.extractAndClean(file.path);
    } catch (pdfError) {
      throw new ApiError(400,
        'Failed to read PDF file. This may be a corrupted PDF or an unsupported format. ' +
        'Error: ' + pdfError.message
      );
    }

    // Check if we got meaningful text
    if (!rawText || rawText.trim().length < 10) {
      throw new ApiError(400,
        'Could not extract text from this PDF. This appears to be an image-based or scanned PDF. ' +
        'OCR (Optical Character Recognition) support is coming in a future update. ' +
        'For now, please use text-based PDFs or manually enter the recipe.'
      );
    }

    // Warn if text seems too short (might be low quality extraction)
    if (rawText.trim().length < 50) {
      console.warn(`Warning: PDF text extraction yielded very short text (${rawText.length} chars) for file: ${file.originalname}`);
    }

    // 3. Parse recipe with AI
    const parsedRecipe = await AIService.parseRecipe(rawText);

    // 4. Save as pending recipe
    const pendingRecipeId = await PendingRecipeModel.create({
      fileId,
      title: parsedRecipe.title,
      source: parsedRecipe.source,
      category: parsedRecipe.category,
      description: parsedRecipe.description,
      instructions: parsedRecipe.instructions,
      rawText,
      parsedData: parsedRecipe,
      ingredients: parsedRecipe.ingredients,
      tags: parsedRecipe.tags
    });

    // 5. Mark file as processed
    await FileModel.markAsProcessed(fileId);

    res.json({
      success: true,
      message: 'PDF parsed successfully',
      data: {
        fileId,
        pendingRecipeId,
        fileName: file.originalname,
        recipe: await PendingRecipeModel.findById(pendingRecipeId)
      }
    });
  } catch (error) {
    // If parsing fails, we still keep the file record but don't mark as processed
    throw new ApiError(500, `PDF processing failed: ${error.message}`);
  }
});

/**
 * Get all pending recipes
 * GET /api/admin/pending-recipes
 */
exports.getPendingRecipes = asyncHandler(async (req, res) => {
  const pendingRecipes = await PendingRecipeModel.getAll();

  res.json({
    success: true,
    data: pendingRecipes
  });
});

/**
 * Get single pending recipe
 * GET /api/admin/pending-recipes/:id
 */
exports.getPendingRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recipe = await PendingRecipeModel.findById(id);

  if (!recipe) {
    throw new ApiError(404, 'Pending recipe not found');
  }

  res.json({
    success: true,
    data: recipe
  });
});

/**
 * Update pending recipe
 * PUT /api/admin/pending-recipes/:id
 */
exports.updatePendingRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, source, category, description, instructions, ingredients, tags } = req.body;

  // Validate
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  // Check if exists
  const existing = await PendingRecipeModel.findById(id);
  if (!existing) {
    throw new ApiError(404, 'Pending recipe not found');
  }

  // Update
  await PendingRecipeModel.update(id, {
    title,
    source,
    category,
    description,
    instructions,
    ingredients,
    tags
  });

  // Return updated recipe
  const updated = await PendingRecipeModel.findById(id);

  res.json({
    success: true,
    message: 'Pending recipe updated',
    data: updated
  });
});

/**
 * Delete pending recipe
 * DELETE /api/admin/pending-recipes/:id
 */
exports.deletePendingRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await PendingRecipeModel.findById(id);
  if (!existing) {
    throw new ApiError(404, 'Pending recipe not found');
  }

  // Delete with image cleanup (true) since this is a rejection/deletion
  await PendingRecipeModel.delete(id, true);

  res.json({
    success: true,
    message: 'Pending recipe deleted'
  });
});

/**
 * Import recipe from URL
 * POST /api/admin/import-url
 */
exports.importFromUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = req.user.id;

  if (!url || !url.trim()) {
    throw new ApiError(400, 'URL is required');
  }

  let downloadedImage = null;

  try {
    // 1. Scrape the URL
    const scraped = await UrlScraper.scrape(url.trim());

    let parsedRecipe;
    let rawText;

    if (scraped.type === 'structured') {
      // Structured data (JSON-LD) was found - use it directly
      parsedRecipe = scraped.data;
      rawText = JSON.stringify(scraped.data, null, 2);
    } else {
      // Unstructured - need AI to parse it
      rawText = `URL: ${scraped.source}\nTitle: ${scraped.data.title}\n\n${scraped.data.content}`;
      parsedRecipe = await AIService.parseRecipeFromWebPage(scraped.data, scraped.source);
    }

    // Ensure source URL is preserved
    if (!parsedRecipe.source) {
      parsedRecipe.source = scraped.hostname;
    }

    // 2. Try to download the recipe image if available
    if (parsedRecipe.image) {
      console.log(`Attempting to download image from: ${parsedRecipe.image}`);
      downloadedImage = await UrlScraper.downloadImage(parsedRecipe.image, UPLOAD_DIRS.images);
      if (downloadedImage) {
        console.log(`Successfully downloaded image: ${downloadedImage.filename}`);
      } else {
        console.log('Image download failed or was skipped');
      }
    }

    // 3. Create a file record for tracking (using URL as reference)
    const fileId = await FileModel.create({
      filename: `url-import-${Date.now()}.txt`,
      originalName: url,
      filePath: url, // Store URL as file path for reference
      fileSize: rawText.length,
      mimeType: 'text/x-url',
      uploadedBy: userId
    });

    // 4. Save as pending recipe (include image data if downloaded)
    const pendingRecipeId = await PendingRecipeModel.create({
      fileId,
      title: parsedRecipe.title,
      source: parsedRecipe.source,
      category: parsedRecipe.category,
      description: parsedRecipe.description,
      instructions: parsedRecipe.instructions,
      rawText,
      parsedData: parsedRecipe,
      ingredients: parsedRecipe.ingredients || [],
      tags: parsedRecipe.tags || [],
      // Image data for pending recipe
      imageData: downloadedImage
    });

    // 5. Mark file as processed
    await FileModel.markAsProcessed(fileId);

    res.json({
      success: true,
      message: 'Recipe imported successfully from URL',
      data: {
        fileId,
        pendingRecipeId,
        sourceUrl: url,
        extractionType: scraped.type,
        hasImage: !!downloadedImage,
        recipe: await PendingRecipeModel.findById(pendingRecipeId)
      }
    });
  } catch (error) {
    // Clean up downloaded image if import failed after download
    if (downloadedImage && downloadedImage.filePath) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(downloadedImage.filePath);
        console.log(`Cleaned up image after failed import: ${downloadedImage.filePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up image after failed import: ${cleanupError.message}`);
      }
    }

    // Re-throw API errors as-is
    if (error instanceof ApiError) {
      throw error;
    }
    // Wrap other errors
    throw new ApiError(400, error.message);
  }
});

/**
 * Approve and save pending recipe to main recipes table
 * POST /api/admin/pending-recipes/:id/approve
 */
exports.approvePendingRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get pending recipe
  const pendingRecipe = await PendingRecipeModel.findById(id);
  if (!pendingRecipe) {
    throw new ApiError(404, 'Pending recipe not found');
  }

  // Import models
  const RecipeModel = require('../models/recipeModel');
  const RecipeImageModel = require('../models/recipeImageModel');

  // Create actual recipe (returns full recipe object, not just ID)
  const recipe = await RecipeModel.create({
    title: pendingRecipe.title,
    source: pendingRecipe.source,
    instructions: pendingRecipe.instructions,
    ingredients: pendingRecipe.ingredients,
    tags: pendingRecipe.tags,
    imagePath: null
  });

  const recipeId = recipe.id;

  // If there's an extracted image, create a RecipeImageModel entry
  let imageCreated = false;
  if (pendingRecipe.image_filename && pendingRecipe.image_file_path) {
    try {
      await RecipeImageModel.create({
        recipeId: recipeId,
        filename: pendingRecipe.image_filename,
        originalName: pendingRecipe.image_original_name || 'recipe-image.jpg',
        filePath: pendingRecipe.image_file_path,
        fileSize: pendingRecipe.image_file_size || 0,
        mimeType: pendingRecipe.image_mime_type || 'image/jpeg',
        isHero: true, // Set as hero image
        uploadedBy: userId
      });
      imageCreated = true;
      console.log(`Created hero image for recipe ${recipeId}: ${pendingRecipe.image_filename}`);
    } catch (imageError) {
      // Image insert failed - clean up the orphaned file
      console.error('Failed to create recipe image:', imageError.message);
      try {
        const fs = require('fs').promises;
        await fs.unlink(pendingRecipe.image_file_path);
        console.log(`Cleaned up orphaned image file: ${pendingRecipe.image_file_path}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up orphaned image: ${cleanupError.message}`);
      }
    }
  }

  // Delete pending recipe (image file is now associated with the approved recipe, or was cleaned up)
  await PendingRecipeModel.delete(id);

  res.json({
    success: true,
    message: 'Recipe approved and saved',
    data: {
      recipeId,
      imageCreated
    }
  });
});
