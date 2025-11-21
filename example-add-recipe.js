// Example script to add a recipe programmatically
// Run with: node example-add-recipe.js

const RecipeModel = require('./src/models/recipeModel');

const exampleRecipe = {
  title: "Mom's Famous Banana Bread",
  source: "Mom's handwritten recipe card",
  instructions: `1. Preheat oven to 350°F (175°C)
2. Grease a 9x5 inch loaf pan
3. In a large bowl, mash the bananas
4. Mix in melted butter
5. Stir in sugar, egg, and vanilla
6. Sprinkle baking soda and salt over mixture and mix
7. Add flour and mix until just combined
8. Pour batter into prepared pan
9. Bake for 60 minutes or until toothpick comes out clean
10. Cool in pan for 10 minutes, then turn out onto wire rack`,
  imagePath: "uploads/banana-bread.jpg",
  ingredients: [
    { name: "ripe bananas", quantity: "3", unit: "whole" },
    { name: "butter", quantity: "1/3", unit: "cup" },
    { name: "sugar", quantity: "3/4", unit: "cup" },
    { name: "egg", quantity: "1", unit: "whole" },
    { name: "vanilla extract", quantity: "1", unit: "tsp" },
    { name: "baking soda", quantity: "1", unit: "tsp" },
    { name: "salt", quantity: "1/4", unit: "tsp" },
    { name: "all-purpose flour", quantity: "1.5", unit: "cups" }
  ],
  tags: ["bread", "breakfast", "dessert", "banana"]
};

try {
  const recipe = RecipeModel.create(exampleRecipe);
  console.log('Recipe added successfully!');
  console.log('Recipe ID:', recipe.id);
  console.log('Title:', recipe.title);
  console.log('Ingredients:', recipe.ingredients.length);
  console.log('Tags:', recipe.tags.join(', '));
} catch (error) {
  console.error('Error adding recipe:', error);
}
