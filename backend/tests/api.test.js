const request = require('supertest');

// Set test environment variables before requiring the app
process.env.NODE_ENV = 'test';
process.env.PORT = 3002;
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only';
// MySQL test database - uses environment variables or defaults
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
process.env.DB_USER = process.env.TEST_DB_USER || 'root';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'moms_recipes_test';

// Require modules after setting environment variables
const db = require('../src/config/database');
const app = require('../src/server');
const UserModel = require('../src/models/userModel');

// Global test user and auth token
let authToken = null;
let csrfToken = null;
let csrfCookie = null;

// Helper function to get CSRF token
const getCsrfToken = async () => {
  const response = await request(app)
    .get('/api/csrf-token');

  // Extract CSRF token from response
  csrfToken = response.body.csrfToken;

  // Extract CSRF cookie for subsequent requests (double-submit pattern)
  const cookies = response.headers['set-cookie'];
  if (cookies && cookies.length > 0) {
    // Find the CSRF cookie (__Host-csrf or similar)
    const csrfCookieHeader = cookies.find(cookie => cookie.includes('csrf'));
    if (csrfCookieHeader) {
      csrfCookie = csrfCookieHeader.split(';')[0];
    }
  }
  return { csrfToken, cookies };
};

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

    // Get CSRF token after login
    await getCsrfToken();
  } catch (error) {
    console.error('Failed to setup test auth:', error);
  }
};

// Helper to build cookie string with both auth and CSRF cookies
const buildCookieString = () => {
  const cookies = [];
  if (authToken) cookies.push(`token=${authToken}`);
  if (csrfCookie) cookies.push(csrfCookie);
  return cookies;
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
    .set('Cookie', buildCookieString())
    .set('x-csrf-token', csrfToken)
    .send({ ...defaultRecipe, ...overrides });

  return response.body.recipe;
};

describe('Recipe API Integration Tests', () => {
  // Clean up test database before and after tests
  beforeAll(async () => {
    // Wait for database initialization
    await db.ensureInitialized();
    // Clear any existing data
    await db.clearDatabase();
    // Setup authentication
    await setupTestAuth();
  });

  afterEach(async () => {
    // Clear only recipe data between tests to ensure test isolation
    // Keep users (including test admin) to maintain auth
    const pool = db.getPool();
    await pool.execute('DELETE FROM recipe_tags');
    await pool.execute('DELETE FROM ingredients');
    await pool.execute('DELETE FROM tags');
    await pool.execute('DELETE FROM recipes');
  });

  afterAll(async () => {
    // Close database connection
    await db.closeDatabase();
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .send({
            title: 'Tag Test Recipe',
            tags: ['Dessert', 'dessert', 'DESSERT', 'cookies', 'Cookies']
          })
          .expect(201);

        // Sort both arrays for comparison since MySQL doesn't guarantee order
        expect(response.body.recipe.tags.sort()).toEqual(['cookies', 'dessert']);
      });

      test('should trim ingredient values', async () => {
        const response = await request(app)
          .post('/api/recipes')
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .send({
            title: 'Updated Test Recipe',
            tags: ['updated', 'test']
          })
          .expect(200);

        expect(response.body.message).toBe('Recipe updated successfully');
        expect(response.body.recipe.title).toBe('Updated Test Recipe');
        // Sort for comparison since MySQL doesn't guarantee order
        expect(response.body.recipe.tags.sort()).toEqual(['test', 'updated']);
      });

      test('should normalize tags on update', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .send({
            tags: ['UPDATED', 'updated', 'Test']
          })
          .expect(200);

        // Sort for comparison since MySQL doesn't guarantee order
        expect(response.body.recipe.tags.sort()).toEqual(['test', 'updated']);
      });

      test('should return 404 for non-existent recipe', async () => {
        const response = await request(app)
          .put('/api/recipes/99999')
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .send({ title: 'New Title' })
          .expect(404);

        expect(response.body.error).toBe('Recipe not found');
      });

      test('should fail with invalid ingredient data', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
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
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .expect(404);

        expect(response.body.error).toBe('Recipe not found');
      });
    });
  });

  describe('Admin Recipe List', () => {
    describe('GET /api/admin/recipes - Admin Recipe Table', () => {
      test('should return paginated admin recipe list with all columns', async () => {
        // Create test recipes
        await createTestRecipe({
          title: 'Admin Test Recipe 1',
          tags: ['dinner'],
          ingredients: [{ name: 'chicken', quantity: '1', unit: 'lb' }]
        });
        await createTestRecipe({
          title: 'Admin Test Recipe 2',
          tags: ['dessert'],
          ingredients: [{ name: 'sugar', quantity: '2', unit: 'cups' }]
        });

        const response = await request(app)
          .get('/api/admin/recipes')
          .set('Cookie', buildCookieString())
          .expect(200);

        expect(response.body).toHaveProperty('recipes');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.recipes)).toBe(true);
        expect(response.body.recipes.length).toBeGreaterThanOrEqual(2);

        // Check all expected columns are present
        const recipe = response.body.recipes[0];
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('dateAdded');
        expect(recipe).toHaveProperty('category');
        expect(recipe).toHaveProperty('mainIngredient');
        expect(recipe).toHaveProperty('timesCooked');
      });

      test('should support sorting by title', async () => {
        await createTestRecipe({ title: 'Apple Pie' });
        await createTestRecipe({ title: 'Zebra Cake' });

        const responseAsc = await request(app)
          .get('/api/admin/recipes?sortBy=title&sortOrder=ASC')
          .set('Cookie', buildCookieString())
          .expect(200);

        const titlesAsc = responseAsc.body.recipes.map(r => r.title);
        expect(titlesAsc[0]).toBe('Apple Pie');

        const responseDesc = await request(app)
          .get('/api/admin/recipes?sortBy=title&sortOrder=DESC')
          .set('Cookie', buildCookieString())
          .expect(200);

        const titlesDesc = responseDesc.body.recipes.map(r => r.title);
        expect(titlesDesc[0]).toBe('Zebra Cake');
      });

      test('should support sorting by times_cooked', async () => {
        const response = await request(app)
          .get('/api/admin/recipes?sortBy=times_cooked&sortOrder=DESC')
          .set('Cookie', buildCookieString())
          .expect(200);

        expect(response.body).toHaveProperty('recipes');
      });

      test('should reject invalid sort columns', async () => {
        const response = await request(app)
          .get('/api/admin/recipes?sortBy=invalid_column')
          .set('Cookie', buildCookieString())
          .expect(200);

        // Should fall back to default sort (date_added)
        expect(response.body).toHaveProperty('recipes');
      });

      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/admin/recipes')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/recipes/:id/cooked - Increment Times Cooked', () => {
      test('should increment times cooked', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .post(`/api/recipes/${recipe.id}/cooked`)
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .expect(200);

        expect(response.body.message).toBe('Times cooked updated successfully');
        expect(response.body.timesCooked).toBe(1);

        // Increment again
        const response2 = await request(app)
          .post(`/api/recipes/${recipe.id}/cooked`)
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .expect(200);

        expect(response2.body.timesCooked).toBe(2);
      });

      test('should return 404 for non-existent recipe', async () => {
        const response = await request(app)
          .post('/api/recipes/99999/cooked')
          .set('Cookie', buildCookieString())
          .set('x-csrf-token', csrfToken)
          .expect(404);

        expect(response.body.error).toBe('Recipe not found');
      });

      test('should require CSRF token', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .post(`/api/recipes/${recipe.id}/cooked`)
          .set('Cookie', buildCookieString())
          .expect(403);

        expect(response.body.error).toContain('CSRF');
      });

      test('should require authentication', async () => {
        const recipe = await createTestRecipe();

        const response = await request(app)
          .post(`/api/recipes/${recipe.id}/cooked`)
          .set('x-csrf-token', csrfToken)
          .expect(401);

        expect(response.body).toHaveProperty('error');
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

  describe('CSRF Protection', () => {
    test('should reject state-changing requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', buildCookieString())
        .send({
          title: 'Test Recipe'
        })
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });

    test('should provide CSRF token endpoint', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('csrfToken');
      expect(typeof response.body.csrfToken).toBe('string');
    });
  });
});
