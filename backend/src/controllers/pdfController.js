const path = require('path');
const FileModel = require('../models/fileModel');
const PendingRecipeModel = require('../models/pendingRecipeModel');
const PDFParser = require('../services/pdfParser');
const ClaudeService = require('../services/claudeService');
const { ApiError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');

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

    // 3. Parse recipe with Claude
    const parsedRecipe = await ClaudeService.parseRecipe(rawText);

    // 4. Save as pending recipe
    const pendingRecipeId = await PendingRecipeModel.create({
      fileId,
      title: parsedRecipe.title,
      source: parsedRecipe.source,
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
  const { title, source, instructions, ingredients, tags } = req.body;

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

  await PendingRecipeModel.delete(id);

  res.json({
    success: true,
    message: 'Pending recipe deleted'
  });
});

/**
 * Approve and save pending recipe to main recipes table
 * POST /api/admin/pending-recipes/:id/approve
 */
exports.approvePendingRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get pending recipe
  const pendingRecipe = await PendingRecipeModel.findById(id);
  if (!pendingRecipe) {
    throw new ApiError(404, 'Pending recipe not found');
  }

  // Import RecipeModel to create recipe
  const RecipeModel = require('../models/recipeModel');

  // Create actual recipe
  const recipeId = await RecipeModel.create({
    title: pendingRecipe.title,
    source: pendingRecipe.source,
    instructions: pendingRecipe.instructions,
    ingredients: pendingRecipe.ingredients,
    tags: pendingRecipe.tags,
    imagePath: null // No image from PDF
  });

  // Delete pending recipe
  await PendingRecipeModel.delete(id);

  res.json({
    success: true,
    message: 'Recipe approved and saved',
    data: {
      recipeId
    }
  });
});
