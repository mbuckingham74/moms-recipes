const SubmittedRecipeModel = require('../models/submittedRecipeModel');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Validate recipe submission input
 */
const validateSubmission = (data) => {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 255) {
    errors.push('Title must be 255 characters or less');
  }

  if (data.source && data.source.length > 255) {
    errors.push('Source must be 255 characters or less');
  }

  if (data.servings && (isNaN(data.servings) || data.servings < 1)) {
    errors.push('Servings must be a positive number');
  }

  if (data.ingredients) {
    if (!Array.isArray(data.ingredients)) {
      errors.push('Ingredients must be an array');
    } else {
      data.ingredients.forEach((ing, index) => {
        if (!ing.name || ing.name.trim().length === 0) {
          errors.push(`Ingredient ${index + 1} requires a name`);
        }
      });
    }
  }

  if (data.tags) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else if (data.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }
  }

  return errors;
};

/**
 * Submit a new recipe for review
 * POST /api/users/submissions
 */
exports.submitRecipe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, source, instructions, servings, ingredients, tags } = req.body;

  const errors = validateSubmission(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, 'Validation failed', errors);
  }

  const submissionId = await SubmittedRecipeModel.create(userId, {
    title: title.trim(),
    source: source?.trim(),
    instructions: instructions?.trim(),
    servings: servings ? parseInt(servings, 10) : null,
    ingredients: ingredients || [],
    tags: tags || []
  });

  const submission = await SubmittedRecipeModel.getById(submissionId);

  res.status(201).json({
    success: true,
    message: 'Recipe submitted for review',
    submission
  });
});

/**
 * Get current user's submissions
 * GET /api/users/submissions
 */
exports.getMySubmissions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const status = req.query.status || null;

  const { submissions, total } = await SubmittedRecipeModel.getByUserId(userId, {
    limit,
    offset,
    status
  });

  res.json({
    success: true,
    submissions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + submissions.length < total
    }
  });
});

/**
 * Get a specific submission by ID (must be owner)
 * GET /api/users/submissions/:id
 */
exports.getSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const submission = await SubmittedRecipeModel.getById(id);

  if (!submission) {
    throw new ApiError(404, 'Submission not found');
  }

  // Regular users can only see their own submissions
  if (req.user.role !== 'admin' && submission.userId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  res.json({
    success: true,
    submission
  });
});

/**
 * Delete a submission (must be owner and pending)
 * DELETE /api/users/submissions/:id
 */
exports.deleteSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await SubmittedRecipeModel.delete(id, userId);

  if (!deleted) {
    throw new ApiError(404, 'Submission not found or cannot be deleted');
  }

  res.json({
    success: true,
    message: 'Submission deleted successfully'
  });
});

// =====================
// Admin-only endpoints
// =====================

/**
 * Get all pending submissions (admin only)
 * GET /api/admin/submissions/pending
 */
exports.getPendingSubmissions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const { submissions, total } = await SubmittedRecipeModel.getPending({
    limit,
    offset
  });

  res.json({
    success: true,
    submissions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + submissions.length < total
    }
  });
});

/**
 * Get all submissions with optional filter (admin only)
 * GET /api/admin/submissions
 */
exports.getAllSubmissions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const status = req.query.status || null;

  const { submissions, total } = await SubmittedRecipeModel.getAll({
    limit,
    offset,
    status
  });

  res.json({
    success: true,
    submissions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + submissions.length < total
    }
  });
});

/**
 * Get a submission for review (admin only)
 * GET /api/admin/submissions/:id
 */
exports.getSubmissionForReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const submission = await SubmittedRecipeModel.getById(id);

  if (!submission) {
    throw new ApiError(404, 'Submission not found');
  }

  res.json({
    success: true,
    submission
  });
});

/**
 * Approve a submission (admin only)
 * POST /api/admin/submissions/:id/approve
 */
exports.approveSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;

  try {
    const newRecipeId = await SubmittedRecipeModel.approve(id, adminId, notes);

    res.json({
      success: true,
      message: 'Submission approved and recipe created',
      recipeId: newRecipeId
    });
  } catch (error) {
    if (error.message === 'Submission not found or already reviewed') {
      throw new ApiError(404, error.message);
    }
    throw error;
  }
});

/**
 * Reject a submission (admin only)
 * POST /api/admin/submissions/:id/reject
 */
exports.rejectSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const adminId = req.user.id;

  if (!notes || notes.trim().length === 0) {
    throw new ApiError(400, 'Rejection reason is required');
  }

  try {
    await SubmittedRecipeModel.reject(id, adminId, notes.trim());

    res.json({
      success: true,
      message: 'Submission rejected'
    });
  } catch (error) {
    if (error.message === 'Submission not found or already reviewed') {
      throw new ApiError(404, error.message);
    }
    throw error;
  }
});

/**
 * Get pending submission count (admin only)
 * GET /api/admin/submissions/count
 */
exports.getPendingCount = asyncHandler(async (req, res) => {
  const count = await SubmittedRecipeModel.getPendingCount();

  res.json({
    success: true,
    count
  });
});
