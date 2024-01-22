const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Product = require("../models/product");
const Category = require("../models/category");
const mongoose = require("mongoose");
const faker = require("faker");
const connectDB = require("./../config/db");
connectDB();

async function seedDB() {
  faker.seed(0);

  // ----------------------rawfruits
  const rawfruits_titles = ["mango", "banana", "apple", "Grapes"];
  const rawfruits_imgs = [
    "https://www.mango.org/wp-content/uploads/2019/05/Mango-Facts-A-variety-of-mangos-on-a-blue-background-1.jpg",
    "https://www.mango.org/wp-content/uploads/2019/05/Mango-Facts-A-variety-of-mangos-on-a-blue-background-1.jpg",
    "https://www.mango.org/wp-content/uploads/2019/05/Mango-Facts-A-variety-of-mangos-on-a-blue-background-1.jpg",
    "https://www.mango.org/wp-content/uploads/2019/05/Mango-Facts-A-variety-of-mangos-on-a-blue-background-1.jpg",
  ];

  // --------------------fruitSalads
  const fruitSalads_titles = ["salad1", "salad2", "salad3", "salad4"];

  const fruitSalads_imgs = [
    "https://www.acouplecooks.com/wp-content/uploads/2019/05/Chopped-Salad-001_1.jpg",
    "https://www.acouplecooks.com/wp-content/uploads/2019/05/Chopped-Salad-001_1.jpg",
    "https://www.acouplecooks.com/wp-content/uploads/2019/05/Chopped-Salad-001_1.jpg",
    "https://www.acouplecooks.com/wp-content/uploads/2019/05/Chopped-Salad-001_1.jpg",
  ];

  // --------------------coldPressedJuices
  const coldPressedJuices_titles = ["cold1", "cold2"];

  const coldPressedJuices_imgs = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/BluePrint_Cold_Pressed_Juice.jpg/330px-BluePrint_Cold_Pressed_Juice.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/BluePrint_Cold_Pressed_Juice.jpg/330px-BluePrint_Cold_Pressed_Juice.jpg",
  ];

  // --------------------fruitShakes
  const fruitShakes_titles = ["shake1", "shake2"];
  const fruitShakes_imgs = [
    "https://www.acouplecooks.com/wp-content/uploads/2020/11/Chia-Seed-Smoothie-004.jpg",
    "https://www.acouplecooks.com/wp-content/uploads/2020/11/Chia-Seed-Smoothie-004.jpg",
  ];

  async function seedProducts(titlesArr, imgsArr, categStr) {
    try {
      const categ = await Category.findOne({ title: categStr });
      for (let i = 0; i < titlesArr.length; i++) {
        const prod = new Product({
          productCode: faker.helpers.replaceSymbolWithNumber("####-##########"),
          title: titlesArr[i],
          imagePath: imgsArr[i],
          description: faker.lorem.paragraph(),
          price: faker.random.number({ min: 10, max: 50 }),
          manufacturer: faker.company.companyName(0),
          available: true,
          category: categ._id,
        });
        await prod.save();
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async function closeDB() {
    console.log("CLOSING CONNECTION");
    await mongoose.disconnect();
  }

  await seedProducts(rawfruits_titles, rawfruits_imgs, "Raw Fruits");
  await seedProducts(
    coldPressedJuices_titles,
    coldPressedJuices_imgs,
    "Cold Pressed Juices"
  );
  await seedProducts(fruitSalads_titles, fruitSalads_imgs, "Fruit Salads");
  await seedProducts(fruitShakes_titles, fruitShakes_imgs, "Fruit shakes");
  await closeDB();
}

seedDB();
