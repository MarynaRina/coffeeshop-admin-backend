const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors({ origin: "*" })); 
app.use(bodyParser.json());

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://androidcoffeeshop-6380f-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database(); 

// ✅ Додаємо нову каву
app.post("/add-coffee", async (req, res) => {
  try {
    let { name, price, description, imageUrl, category } = req.body;

    if (!name || !price || !imageUrl || !description || !category) {
      return res.status(400).json({ message: "Всі поля обов’язкові" });
    }

    // Перетворюємо `price` на число
    price = Number(price);

    // Перевіряємо, чи `price` коректний (не NaN)
    if (isNaN(price)) {
      return res.status(400).json({ message: "Ціна має бути числом" });
    }

    const coffeeRef = db.ref("Coffee");
    const newCoffeeRef = coffeeRef.push();

    await newCoffeeRef.set({
      id: newCoffeeRef.key,
      name,
      price, // Записуємо як число
      imageUrl,
      description,
      category,
    });

    res.status(201).json({ message: "Каву додано успішно", id: newCoffeeRef.key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Отримуємо список кави з Realtime Database
app.get("/get-coffees", async (req, res) => {
  try {
    const snapshot = await db.ref("Coffee").once("value");
    const coffees = snapshot.val();

    if (!coffees) {
      return res.json([]);
    }

    const coffeeList = Object.values(coffees).map(c => ({
      ...c,
      price: parseFloat(c.price), // ✅ Гарантуємо, що `price` — це число
    }));

    res.json(coffeeList);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
});

// ✅ Оновлюємо каву в Realtime Database
app.put("/update-coffee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, imageUrl, description, category } = req.body;

    if (!name && !price && !imageUrl && !description && !category) {
      return res.status(400).json({ message: "Немає даних для оновлення" });
    }

    const coffeeRef = db.ref(`Coffee/${id}`);
    const snapshot = await coffeeRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Кава не знайдена" });
    }

    await coffeeRef.update({
      ...(name && { name }),
      ...(price && { price }),
      ...(imageUrl && { imageUrl }),
      ...(description && { description }),
      ...(category && { category }),
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Каву оновлено успішно" });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
});

// ✅ Запускаємо сервер
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});