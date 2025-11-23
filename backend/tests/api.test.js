const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Create a test database in a temporary location
const testDbPath = path.join(__dirname, '../data/test-recipes.db');

// Set test environment variables before requiring the app
process.env.NODE_ENV = 'test';
process.env.PORT = 3002;
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret-key';

// Require modules after setting environment variables
const db = require('../src/config/database');
const app = require('../src/server');
const UserModel = require('../src/models/userModel');

// Global test user and auth token
let authToken = null;

// Helper function to create a test admin user and login
const setupTestAuth = async () => {
  try {
    // Create admin user
    await UserModel.create({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'testpassword123',
      role: 'admin'
    });

    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testpassword123'
      });

    // Extract token from cookie
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        authToken = tokenCookie.split(';')[0].split('=')[1];
      }
    }
  } catch (error) {
    console.error('Failed to setup test auth:', error);
  }
};

// Helper function to create a test recipe
const createTestRecipe = async (overrides = {}) => {
  const defaultRecipe = {
    title: 'Test Chocolate Chip Cookies',
    source: 'Test Cookbook',
    instructions: '1. Mix ingredients\n2. Bake at 350°F',
    imagePath: 'uploads/test-cookies.jpg',
    ingredients: [
      { name: 'flour', quantity: '2', unit: 'cups' },
      { name: 'sugar', quantity: '1', unit: 'cup' },
      { name: 'chocolate chips', quantity: '2', unit: 'cups' }
    ],
    tags: ['dessert', 'cookies', 'baking']
  };

  const response = await request(app)
    .post('/api/recipes')
    .set('Cookie', [`token=${authToken}`])
    .send({ ...defaultRecipe, ...overrides });

  return response.body.recipe;
};

describe('Recipe API Integration Tests', () => {
  // Clean up test database before and after tests
  beforeAll(async () => {
    // Database is already initialized by requiring the modules
    // Clear any existing data
    db.clearDatabase();
    // Setup authentication
    await setupTestAuth();
  });

  afterEach(async () => {
    // Clear only recipe data between tests to ensure test isolation
    // Keep users (including test admin) to maintain auth
    const stmt = db.prepare('DELETE FROM recipes');
    await stmt.run();
    const stmtIngredients = db.prepare('DELETE FROM ingredients');
    await stmtIngredients.run();
    const stmtTags = db.prepare('DELETE FROM recipe_tags');
    await stmtTags.run();
  });

  afterAll(() => {
    // Close database connection
    db.closeDatabase();

    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Health Check', () => {
    test('GET /health should return 200 and status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        message: 'Recipe API is running'
      });
    });
  });

  describe('Recipe CRUD Operations', () => {
    describe('POST /api/recipes - Create Recipe', () => {
      test('should create a recipe with valid data', async () => {
        const recipeData = {
          title: 'Test Chocolate Chip Cookies',
          source: 'Test Cookbook',
          instructions: '1. Mix ingredients\n2. Bake at 350°F',
          imagePath: 'uploads/test-cookies.jpg',
          ingredients: [
            { name: 'flour', quantity: '2', unit: 'cups' },
            { name: 'sugar', quantity: '1', unit: 'cup' },
            { name: 'chocolate chips', quantity: '2', unit: 'cups' }
          ],
          tags: ['dessert', 'cookies', 'baking']
        };

        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send(recipeData)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Recipe created successfully');
        expect(response.body.recipe).toHaveProperty('id');
        expect(response.body.recipe.title).toBe('Test Chocolate Chip Cookies');
        expect(response.body.recipe.ingredients).toHaveLength(3);
        expect(response.body.recipe.tags).toHaveLength(3);
      });

      test('should fail without title', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send({
            source: 'Test Source',
            ingredients: []
          })
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toContain('Title is required and must be a non-empty string');
      });

      test('should fail with invalid ingredient (missing name)', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send({
            title: 'Test Recipe',
            ingredients: [{ quantity: '1', unit: 'cup' }]
          })
          .expect(400);

        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('must have a non-empty \'name\' string')
          ])
        );
      });

      test('should fail with invalid tag (non-string)', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send({
            title: 'Test Recipe',
            tags: [123, 'valid-tag']
          })
          .expect(400);

        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Tag at index 0 must be a string')
          ])
        );
      });

      test('should normalize tags to lowercase and dedupe', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send({
            title: 'Tag Test Recipe',
            tags: ['Dessert', 'dessert', 'DESSERT', 'cookies', 'Cookies']
          })
          .expect(201);

        expect(response.body.recipe.tags).toEqual(['dessert', 'cookies']);
      });

      test('should trim ingredient values', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', [`token=${authToken}`])
          .send({
            title: 'Trim Test Recipe',
            ingredients: [
              { name: '  flour  ', quantity: '  2  ', unit: '  cups  ' }
            ]
          })
          .expect(201);

        const ingredient = response.body.recipe.ingredients[0];
        expect(ingredient.name).toBe('flour');
        expect(ingredient.quantity).toBe('2');
        expect(ingredient.unit).toBe('cups');
      });
    });

    describe('GET /api/recipes - List Recipes', () => {
      test('should return paginated list of recipes', async () => {
        // Create some test recipes
        await createTestRecipe();
        await createTestRecipe({ title: 'Recipe 2' });

        const response = await request(app)
          .get('/api/recipes')
          .expect(200);

        expect(response.body).toHaveProperty('recipes');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.recipes)).toBe(true);
        expect(response.body.recipes.length).toBeGreaterThanOrEqual(2);
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('offset');
        expect(response.body.pagination).toHaveProperty('total');
      });

      test('should respect pagination parameters', async () => {
        // Create some test recipes
        await createTestRecipe();
        await createTestRecipe({ title: 'Recipe 2' });
        await createTestRecipe({ title: 'Recipe 3' });

        const response = await request(app)
          .get('/api/recipes?limit=2&offset=0')
          .expect(200);

        expect(response.body.pagination.limit).toBeLessThanOrEqual(2);
      });
    });

    describe('GET /api/recipes/:id - Get Recipe by ID', () => {
      test('should return recipe with full details', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .get(`/api/recipes/${recipe.id}`)
          .expect(200);

        expect(response.body.recipe).toHaveProperty('id', recipe.id);
        expect(response.body.recipe).toHaveProperty('title');
        expect(response.body.recipe).toHaveProperty('ingredients');
        expect(response.body.recipe).toHaveProperty('tags');
        expect(Array.isArray(response.body.recipe.ingredients)).toBe(true);
        expect(Array.isArray(response.body.recipe.tags)).toBe(true);
      });

      test('should return 404 for non-existent recipe', async () => {
        const response = await request(app)
          .get('/api/recipes/99999')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Recipe not found');
      });
    });

    describe('GET /api/recipes/search - Search Recipes', () => {
      beforeEach(async () => {
        // Create test recipes with different ingredients and tags
        await createTestRecipe({
          title: 'Chocolate Chip Cookies',
          ingredients: [
            { name: 'flour', quantity: '2', unit: 'cups' },
            { name: 'sugar', quantity: '1', unit: 'cup' }
          ],
          tags: ['dessert', 'cookies']
        });
        await createTestRecipe({
          title: 'Banana Bread',
          ingredients: [
            { name: 'flour', quantity: '3', unit: 'cups' },
            { name: 'banana', quantity: '3', unit: 'whole' }
          ],
          tags: ['bread', 'breakfast']
        });
      });

      test('should search by title', async () => {
        const response = await request(app)
          .get('/api/recipes/search?title=Chocolate')
          .expect(200);

        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('recipes');
        expect(response.body.count).toBeGreaterThan(0);
        expect(response.body.recipes[0].title).toContain('Chocolate');
      });

      test('should search by single ingredient', async () => {
        const response = await request(app)
          .get('/api/recipes/search?ingredient=flour')
          .expect(200);

        expect(response.body.count).toBeGreaterThanOrEqual(2);
      });

      test('should search by multiple ingredients (AND)', async () => {
        const response = await request(app)
          .get('/api/recipes/search?ingredients=flour,banana')
          .expect(200);

        expect(response.body).toHaveProperty('recipes');
        expect(response.body.count).toBe(1);
        expect(response.body.recipes[0].title).toBe('Banana Bread');
      });

      test('should search by tags', async () => {
        const response = await request(app)
          .get('/api/recipes/search?tags=dessert')
          .expect(200);

        expect(response.body.count).toBeGreaterThan(0);
      });

      test('should fail without search parameters', async () => {
        const response = await request(app)
          .get('/api/recipes/search')
          .expect(400);

        expect(response.body.error).toContain('Please provide at least one search parameter');
      });
    });

    describe('PUT /api/recipes/:id - Update Recipe', () => {
      test('should update recipe with valid data', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Cookie', [`token=${authToken}`])
          .send({
            title: 'Updated Test Recipe',
            tags: ['updated', 'test']
          })
          .expect(200);

        expect(response.body.message).toBe('Recipe updated successfully');
        expect(response.body.recipe.title).toBe('Updated Test Recipe');
        expect(response.body.recipe.tags).toEqual(['updated', 'test']);
      });

      test('should normalize tags on update', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Cookie', [`token=${authToken}`])
          .send({
            tags: ['UPDATED', 'updated', 'Test']
          })
          .expect(200);

        expect(response.body.recipe.tags).toEqual(['updated', 'test']);
      });

      test('should return 404 for non-existent recipe', async () => {
        const response = await request(app)
          .put('/api/recipes/99999')
          .set('Cookie', [`token=${authToken}`])
          .send({ title: 'New Title' })
          .expect(404);

        expect(response.body.error).toBe('Recipe not found');
      });

      test('should fail with invalid ingredient data', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Cookie', [`token=${authToken}`])
          .send({
            ingredients: [{ quantity: '1' }] // missing name
          })
          .expect(400);

        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('must have a non-empty \'name\' string')
          ])
        );
      });
    });

    describe('GET /api/tags - Get All Tags', () => {
      test('should return list of all unique tags', async () => {
        await createTestRecipe({ tags: ['dessert', 'cookies'] });
        await createTestRecipe({ title: 'Recipe 2', tags: ['bread', 'breakfast'] });

        const response = await request(app)
          .get('/api/tags')
          .expect(200);

        expect(response.body).toHaveProperty('tags');
        expect(Array.isArray(response.body.tags)).toBe(true);
        expect(response.body.tags.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('DELETE /api/recipes/:id - Delete Recipe', () => {
      test('should delete recipe', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .delete(`/api/recipes/${recipe.id}`)
          .set('Cookie', [`token=${authToken}`])
          .expect(200);

        expect(response.body.message).toBe('Recipe deleted successfully');

        // Verify recipe is deleted
        await request(app)
          .get(`/api/recipes/${recipe.id}`)
          .expect(404);
      });

      test('should return 404 for non-existent recipe', async () => {
        const response = await request(app)
          .delete('/api/recipes/99999')
          .set('Cookie', [`token=${authToken}`])
          .expect(404);

        expect(response.body.error).toBe('Recipe not found');
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
    });
  });

  describe('Static File Serving', () => {
    test('should serve uploads directory', async () => {
      // This tests that the middleware is configured
      // Actual file serving would require test files to exist
      const response = await request(app)
        .get('/uploads/nonexistent.jpg');

      // Should get 404 from static middleware, not route not found
      expect(response.status).toBe(404);
    });
  });
});
