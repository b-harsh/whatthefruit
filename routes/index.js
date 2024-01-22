const express = require("express");
const Cart = require("../models/cart");
const Product = require("../models/product");
const Order = require("../models/order");
const middleware = require("../middleware");
const router = new express.Router();
const deliveryCharges =
  require("../immutableData/deliveryCharges").deliveryCharges;

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_WoJC6BEFN4DCXN",
  key_secret: "JrzvX5PgMIsR4v7j5DJTOLT5",
});

/**
 *Home Page
 */

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({})
      .sort("-createdAt")
      .populate("category");
    res.render("shop/home", { pageName: "Home", products });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

/**
 *Add a product to the shopping cart when "Add to cart" button is pressed
 *@param {}
 *
 */
// GET: add a product to the shopping cart when "Add to cart" button is pressed
router.get("/add-to-cart/:id", async (req, res) => {
  const productId = req.params.id;
  try {
    // get the correct cart, either from the db, session, or an empty cart.
    let userCart;
    if (req.user) {
      userCart = await Cart.findOne({ user: req.user._id });
    }
    let cart;
    if (
      (req.user && !userCart && req.session.cart) ||
      (!req.user && req.session.cart)
    ) {
      cart = await new Cart(req.session.cart);
    } else if (!req.user || !userCart) {
      cart = new Cart({});
    } else {
      cart = userCart;
    }

    // add the product to the cart
    const product = await Product.findById(productId);
    const itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      // if product exists in the cart, update the quantity
      cart.items[itemIndex].qty++;
      cart.items[itemIndex].price =
        cart.items[itemIndex].qty *
        (product.discountPrice ? product.discountPrice : product.price);
      cart.totalQty++;
      cart.totalCost += product.discountPrice
        ? product.discountPrice
        : product.price;
    } else {
      // if product does not exists in cart, find it in the db to retrieve its price and add new item

      cart.items.push({
        productId: productId,
        qty: 1,
        price: product.discountPrice ? product.discountPrice : product.price,
        title: product.title,
        productCode: product.productCode,
      });
      cart.totalQty++;
      cart.totalCost += product.discountPrice
        ? product.discountPrice
        : product.price;
    }

    // if the user is logged in, store the user's id and save cart to the db
    if (req.user) {
      cart.user = req.user._id;
      await cart.save();
    }
    req.session.cart = cart;
    req.flash("success", "Item added to the shopping cart");
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: view shopping cart contents
router.get("/shopping-cart", async (req, res) => {
  try {
    // find the cart, whether in session or in db based on the user state
    let cartUser;
    if (req.user) {
      cartUser = await Cart.findOne({ user: req.user._id });
    }
    // if user is signed in and has cart, load user's cart from the db
    if (req.user && cartUser) {
      req.session.cart = cartUser;
      return res.render("shop/shopping-cart", {
        cart: cartUser,
        pageName: "Shopping Cart",
        products: await productsFromCart(cartUser),
      });
    }
    // if there is no cart in session and user is not logged in, cart is empty
    if (!req.session.cart) {
      return res.render("shop/shopping-cart", {
        cart: null,
        pageName: "Shopping Cart",
        products: null,
      });
    }
    // otherwise, load the session's cart
    return res.render("shop/shopping-cart", {
      cart: req.session.cart,
      pageName: "Shopping Cart",
      products: await productsFromCart(req.session.cart),
    });
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: reduce one from an item in the shopping cart
router.get("/reduce/:id", async function (req, res, next) {
  // if a user is logged in, reduce from the user's cart and save
  // else reduce from the session's cart
  const productId = req.params.id;
  let cart;
  try {
    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
    }

    // find the item with productId
    const itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      // find the product to find its price
      const product = await Product.findById(productId);
      // if product is found, reduce its qty
      cart.items[itemIndex].qty--;
      cart.items[itemIndex].price -= product.discountPrice
        ? product.discountPrice
        : product.price;
      cart.totalQty--;
      cart.totalCost -= product.price;
      // if the item's qty reaches 0, remove it from the cart
      if (cart.items[itemIndex].qty <= 0) {
        await cart.items.remove({ _id: cart.items[itemIndex]._id });
      }
      req.session.cart = cart;
      // save the cart it only if user is logged in
      if (req.user) {
        await cart.save();
      }
      // delete cart if qty is 0
      if (cart.totalQty <= 0) {
        req.session.cart = null;
        await Cart.findByIdAndRemove(cart._id);
      }
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: remove all instances of a single product from the cart
router.get("/removeAll/:id", async function (req, res, next) {
  const productId = req.params.id;
  let cart;
  try {
    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
    }
    // fnd the item with productId
    const itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      // find the product to find its price
      cart.totalQty -= cart.items[itemIndex].qty;
      cart.totalCost -= cart.items[itemIndex].price;
      await cart.items.remove({ _id: cart.items[itemIndex]._id });
    }
    req.session.cart = cart;
    // save the cart it only if user is logged in
    if (req.user) {
      await cart.save();
    }
    // delete cart if qty is 0
    if (cart.totalQty <= 0) {
      req.session.cart = null;
      await Cart.findByIdAndRemove(cart._id);
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: checkout form with csrf token
router.get("/checkout", middleware.isLoggedIn, async (req, res) => {
  const errorMsg = req.flash("error")[0];
  try {
    // find the cart, whether in session or in db based on the user state
    let cartUser;
    if (req.user) {
      cartUser = await Cart.findOne({ user: req.user._id });
    }
    // if user is signed in and has cart, load user's cart from the db
    if (req.user && cartUser) {
      req.session.cart = cartUser;
      return res.render("shop/checkout", {
        cart: cartUser,
        pageName: "CheckOut Yo!!",
        errorMsg,
        products: await productsFromCart(cartUser),
        deliveryCharges: deliveryCharges,
      });
    }
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: view shopping cart contents
router.get("/shopping-cart", async (req, res) => {
  try {
    // find the cart, whether in session or in db based on the user state
    let cartUser;
    if (req.user) {
      cartUser = await Cart.findOne({ user: req.user._id });
    }
    // if user is signed in and has cart, load user's cart from the db
    if (req.user && cartUser) {
      req.session.cart = cartUser;
      return res.render("shop/shopping-cart", {
        cart: cartUser,
        pageName: "Shopping Cart",
        products: await productsFromCart(cartUser),
      });
    }
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

router.get("/delivery_charges", async (req, res) => {
  const pincode = req.query.pincode;
  console.log(pincode);
  req.session.pincode = req.query.pincode;
  const deliveryCharge = await deliveryCharges.find(
    (item) => item.pincode === pincode
  ).delivery_charge;
  req.session.deliveryCharge = deliveryCharge;
  req.session.total_cost =
    req.session.cart.totalCost + req.session.deliveryCharge;
  req.session.save();
  console.log(req.session);
  res.json(deliveryCharges);
});

router.post("/checkout/order", middleware.isLoggedIn, async (req, res) => {
  if (!req.session.cart) {
    return res.redirect("/shopping-cart");
  }
  const money = req.session.total_cost * 100;
  console.log("total money: " + money);
  const options = {
    amount: money,
    currency: "INR",
  };
  await razorpay.orders.create(options, async function (err, order) {
    console.log("razorpay_order_id: " + order.id);
    req.session.razorpay_order_id = order.id;
    await req.session.save();
  });

  console.log(req.session);
});

router.post("/paymentConfirmation", middleware.isLoggedIn, async (req, res) => {
  const money = req.session.total_cost * 100;
  console.log("total money: " + money);
  const options = {
    amount: money,
    currency: "INR",
  };
  await razorpay.orders.create(options, async function (err, order) {
    console.log("razorpay_order_id: " + order.id);
    req.session.razorpay_order_id = order.id;
    await req.session.save();
  });
  req.session.pincode = req.body.pincode;
  req.session.address = req.body.address;
  await req.session.save();
  res.render("shop/payment", {
    pageName: "CheckOut Yo!!",
    deliveryCharges: deliveryCharges,
  });
});

router.post(
  "/checkout/order/success",
  middleware.isLoggedIn,
  async (req, res) => {
    console.log(req.session);
    razorpay.payments.fetch(req.body.razorpay_payment_id).then((doc) => {
      console.log(doc);
    });
    try {
      if (!req.session.cart) {
        return res.redirect("/shopping-cart");
      }

      const cart = await Cart.findById(req.session.cart._id);
      const order = new Order({
        user: req.user,
        cart: {
          totalQty: cart.totalQty,
          totalCost: req.session.total_cost,
          items: cart.items,
        },
        address: req.session.address,
        pincode: req.session.pincode,
        paymentId: req.body.razorpay_payment_id,
        deliveryCharges: req.session.deliveryCharge,
      });

      await order
        .save()
        .then(() => {
          console.log("order saved successfully");
        })
        .catch((err) => {
          console.log("error at /checkout/order/success of order" + err);
        });

      for (const item of cart.items) {
        await cart.items.remove({ _id: item._id });
      }
      cart.totalCost = 0;
      cart.totalQty = 0;
      await cart
        .save()
        .then(() => {
          console.log("cart cleared successfully");
        })
        .catch((err) => {
          console.log("error at /checkout/order/success of cart removal" + err);
        });
      req.session.cart = null;
      req.session.total_cost = 0;
      req.session.deliveryCharge = 0;
      req.session.save();
      await Cart.findByIdAndRemove(cart._id);
      console.log(req.session);
      req.flash("success", "Successfully purchased");
      res.redirect("/user/profile");
    } catch (err) {
      console.log(err.message);
      res.redirect("/shopping-cart");
    }
  }
);

/**
 *Create products array to store the info of each product in the car
 * @param {*} cart
 * @return {[]} products The array of products
 */
async function productsFromCart(cart) {
  const products = []; // array of objects
  for (const item of cart.items) {
    const foundProduct = (
      await Product.findById(item.productId).populate("category")
    ).toObject();
    foundProduct["qty"] = item.qty;
    foundProduct["totalPrice"] = item.price;
    products.push(foundProduct);
  }
  return products;
}

module.exports = router;
