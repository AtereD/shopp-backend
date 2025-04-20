require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require('./cloudinary');
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shopp-products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send("Express App is Running");
});

// Image Upload Endpoint
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: req.file.path,
  });
});

// Models
const Product = mongoose.model("Product", {
  id: Number,
  name: String,
  image: String,
  category: String,
  new_price: Number,
  old_price: Number,
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
});

const Users = mongoose.model("Users", {
  name: String,
  email: { type: String, unique: true },
  password: String,
  cartData: Object,
  date: { type: Date, default: Date.now },
});

// Add Product
app.post("/addproduct", async (req, res) => {
  const products = await Product.find({});
  const id = products.length ? products[products.length - 1].id + 1 : 1;

  const product = new Product({ id, ...req.body });
  await product.save();

  res.json({ success: true, name: req.body.name });
});

// Delete Product
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({ success: true, name: req.body.name });
});

// Get All Products
app.get("/allproducts", async (_, res) => {
  const products = await Product.find({});
  res.send(products);
});

// Signup
app.post("/signup", async (req, res) => {
  const existingUser = await Users.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({ success: false, error: "Email already registered" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const cart = {};
  for (let i = 0; i < 300; i++) cart[i] = 0;

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    cartData: cart,
  });

  await user.save();

  const token = jwt.sign({ user: { id: user._id } }, "secret_ecom");
  res.json({ success: true, token });
});

// Login
app.post("/login", async (req, res) => {
  const user = await Users.findOne({ email: req.body.email });
  if (!user) return res.json({ success: false, errors: "Invalid Email" });

  const isMatch = await bcrypt.compare(req.body.password, user.password);
  if (!isMatch) return res.json({ success: false, errors: "Invalid Password" });

  const token = jwt.sign({ user: { id: user._id } }, "secret_ecom");
  res.json({ success: true, token });
});

// New Collections
app.get("/newcollections", async (_, res) => {
  const products = await Product.find({});
  res.send(products.slice(-8));
});

// Popular in Women
app.get("/popularinwomen", async (_, res) => {
  const products = await Product.find({ category: "women" });
  res.send(products.slice(0, 4));
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) return res.status(401).send({ errors: "Please authenticate with a valid token" });

  try {
    const data = jwt.verify(token, "secret_ecom");
    req.user = data.user;
    next();
  } catch {
    res.status(401).send({ errors: "Invalid token" });
  }
};

// Cart Endpoints
app.post("/addtocart", fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  userData.cartData[req.body.itemId] += 1;
  await userData.save();
  res.send("Added");
});

app.post("/removefromcart", fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  if (userData.cartData[req.body.itemId] > 0) userData.cartData[req.body.itemId] -= 1;
  await userData.save();
  res.send("Removed");
});

app.post("/getcart", fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  res.json(userData.cartData);
});

// Start Server
app.listen(port, () => {
  console.log(`Server Running on Port ${port}`);
});





// require('dotenv').config();
// const port = process.env.PORT || 4000;
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const cloudinary = require('./cloudinary');
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const path = require("path");
// const cors = require("cors");
// const { log } = require("console");

// app.use(express.json());
// app.use(cors());

// // Database Connection with MongoDB
// mongoose.connect(process.env.MONGO_URL).then(() => console.log("Connected to MongoDB"))
// .catch((err) => console.log("MongoDB connection error:", err));

// // API Creation

// app.get("/", (req, res) => {
//   res.send("Express App is Running");
// });

// // Image Storage Engine
// // const storage = multer.diskStorage({
// //   destination: "./upload/images",
// //   filename: (req, file, cb) => {
// //     return cb(
// //       null,
// //       `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
// //     );
// //   },
// // });
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//       folder: 'shopp-products', // optional folder name in your Cloudinary media library
//       allowed_formats: ['jpg', 'png', 'jpeg'],
//       transformation: [{ width: 500, height: 500, crop: 'limit' }],
//     },
//   });

// const upload = multer({ storage: storage });

// // Creating upload endpoint for images

// // app.use("/images", express.static("upload/images"));

// // app.post("/upload", upload.single("product"), (req, res) => {
// //   res.json({
// //     success: 1,
// //     image_url: `https://shopp-backend-7nee.onrender.com/images/${req.file.filename}`,
// //   });
// // });
// app.post("/upload", upload.single("product"), (req, res) => {
//     res.json({
//       success: 1,
//       image_url: req.file.path, // Cloudinary image URL
//     });
//   });

// // Schema for creating products

// const Product = mongoose.model("Product", {
//   id: {
//     type: Number,
//     required: true,
//   },
//   name: {
//     type: String,
//     required: true,
//   },
//   image: {
//     type: String,
//     required: true,
//   },
//   category: {
//     type: String,
//     required: true,
//   },
//   new_price: {
//     type: Number,
//     required: true,
//   },
//   old_price: {
//     type: Number,
//     required: true,
//   },
//   date: {
//     type: Date,
//     default: Date.now,
//   },
//   available: {
//     type: Boolean,
//     default: true,
//   },
// });

// app.post("/addproduct", async (req, res) => {
//   let products = await Product.find({});
//   let id;
//   if (products.length > 0) {
//     let last_product_array = products.slice(-1);
//     let last_product = last_product_array[0];
//     id = last_product.id + 1;
//   } else {
//     id = 1;
//   }
//   const product = new Product({
//     id: id,
//     name: req.body.name,
//     image: req.body.image,
//     category: req.body.category,
//     new_price: req.body.new_price,
//     old_price: req.body.old_price,
//   });
//   console.log(product);
//   await product.save();
//   console.log("Saved");
//   res.json({
//     success: true,
//     name: req.body.name,
//   });
// });

// // Creating API for deleting products

// app.post("/removeproduct", async (req, res) => {
//   await Product.findOneAndDelete({ id: req.body.id });
//   console.log("Removed");
//   res.json({
//     success: true,
//     name: req.body.name,
//   });
// });

// // Creating API for getting all products

// app.get("/allproducts", async (req, res) => {
//   let products = await Product.find({});
//   console.log("All Products Fetched");
//   res.send(products);
// });

// // Shema creating for user model

// const Users = mongoose.model("Users", {
//   name: {
//     type: String,
//   },
//   email: {
//     type: String,
//     unique: true,
//   },
//   password: {
//     type: String,
//   },
//   cartData: {
//     type: Object,
//   },
//   date: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Creating Endpoint for registering the user
// app.post("/signup", async (req, res) => {
//   let check = await Users.findOne({ email: req.body.email });
//   if (check) {
//     return res
//       .status(400)
//       .json({
//         success: false,
//         error: "existing user not found with the same email address",
//       });
//   }
//   let cart = {};
//   for (let i = 0; i < 300; i++) {
//     cart[i] = 0;
//   }
//   const user = new Users({
//     name: req.body.username,
//     email: req.body.email,
//     password: req.body.password,
//     cartData: cart,
//   });

//   await user.save();

//   const data = {
//     user: {
//       id: user.id,
//     },
//   };

//   const token = jwt.sign(data, "secret_ecom");
//   res.json({ success: true, token });
// });

// // Creating endpoint for user login
// app.post("/login", async (req, res) => {
//   let user = await Users.findOne({ email: req.body.email });
//   if (user) {
//     const passCompare = req.body.password === user.password;
//     if (passCompare) {
//       const data = {
//         user: {
//           id: user.id,
//         },
//       };
//       const token = jwt.sign(data, "secret_ecom");
//       res.json({ success: true, token });
//     } else {
//       res.json({ success: false, errors: "Wrong Password" });
//     }
//   } else {
//     res.json({ success: false, errors: "Wrong Email Id" });
//   }
// });

// // creating endpoint for newcollection data
// app.get("/newcollections", async (req, res) => {
//   let products = await Product.find({});
//   let newcollection = products.slice(1).slice(-8);
//   console.log("NewCollection Fetched");
//   res.send(newcollection);
// });

// // creating endpoint for popular in women endpoint
// app.get("/popularinwomen", async (req, res) => {
//   let products = await Product.find({ category: "women" });
//   let popular_in_women = products.slice(0, 4);
//   console.log("Popular in women fetched");
//   res.send(popular_in_women);
// });

// // creating middleware to fetch user
// const fetchUser = async (req, res, next) => {
//   const token = req.header("auth-token");
//   if (!token) {
//     res.status(401).send({ errors: "Please authenticate using valid token" });
//   } else {
//     try {
//       const data = jwt.verify(token, "secret_ecom");
//       req.user = data.user;
//       next();
//     } catch (error) {
//       res
//         .status(401)
//         .send({ errors: "please authenticate using a valid token" });
//     }
//   }
// };

// // creating endpoint for adding products in cartdata
// app.post("/addtocart", fetchUser, async (req, res) => {
//   console.log("Added", req.body.itemId);
//   let userData = await Users.findOne({ _id: req.user.id });
//   userData.cartData[req.body.itemId] += 1;
//   await Users.findOneAndUpdate(
//     { _id: req.user.id },
//     { cartData: userData.cartData }
//   );
//   res.send("Added");
//   // console.log(req.body,req.user);
// });

// // creting endpoint to remove product from cartdata
// app.post("/removefromcart", fetchUser, async (req, res) => {
//   console.log("Removed", req.body.itemId);
//   let userData = await Users.findOne({ _id: req.user.id });
//   if (userData.cartData[req.body.itemId] > 0)
//     userData.cartData[req.body.itemId] -= 1;
//   await Users.findOneAndUpdate(
//     { _id: req.user.id },
//     { cartData: userData.cartData }
//   );
//   res.send("Removed");
// });

// // creating endpoint to get cartdata
// app.post("/getcart", fetchUser, async (req, res) => {
//   console.log("GetCart");
//   let userData = await Users.findOne({ _id: req.user.id });
//   res.json(userData.cartData);
// });

// app.listen(port, (error) => {
//   if (!error) {
//     console.log("Server Running on Port " + port);
//   } else {
//     console.log("Error " + error);
//   }
// });
