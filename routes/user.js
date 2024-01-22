const csrf = require("csurf");
const express = require("express");
const router = new express.Router();
const passport = require("passport");
const Order = require("../models/order");
const Cart = require("../models/cart");
const middleware = require("../middleware");
const User = require("../models/user");
const nodemailer = require("nodemailer");

const {
  userSignUpValidationRules,
  userSignInValidationRules,
  validateSignup,
  validateSignin,
} = require("../config/validator");
const csrfProtection = csrf();
router.use(csrfProtection);

// GET: display the signup form with csrf token
router.get("/signup", middleware.isNotLoggedIn, (req, res) => {
  const errorMsg = req.flash("error")[0];
  res.render("user/signup", {
    csrfToken: req.csrfToken(),
    errorMsg,
    pageName: "Sign Up",
  });
});

// POST: handle the signup logic
router.post(
  "/signup",
  [
    middleware.isNotLoggedIn,
    userSignUpValidationRules(),
    validateSignup,
    passport.authenticate("local.signup", {
      successRedirect: "/user/emailVerification",
      successFlash: true,
      failureRedirect: "/user/signup",
      failureFlash: true,
    }),
  ],
  async (req, res) => {
    try {
      // if there is a cart session, save it to the user's cart in db
      if (req.session.cart) {
        const cart = await new Cart(req.session.cart);
        cart.user = req.user._id;
        await cart.save();
      }

      // // Generate verification token for the user
      // req.user.generateVerificationToken();
      // await req.user.save();

      // // Send verification email to the user
      // const transporter = nodemailer.createTransport({
      //   host: "smtp.gmail.com",
      //   port: 587,
      //   service: "Gmail",
      //   secure: false,
      //   auth: {
      //     user: process.env.GMAIL_EMAIL,
      //     pass: process.env.GMAIL_PASSWORD,
      //   },
      // });

      // const mailOptions = {
      //   from: process.env.GMAIL_EMAIL,
      //   to: req.user.email,
      //   subject: "Email Verification",
      //   text:
      //     "Thank you for signing up! Please verify your email address by clicking on the following link:\n\n" +
      //     `http://${req.headers.host}/user/verify/?token=${req.user.emailVerificationToken}\n\n` +
      //     "If you did not sign up for this account, please ignore this email.\n",
      // };

      // transporter.sendMail(mailOptions, (error, info) => {
      //   if (error) {
      //     console.log(error);
      //     req.flash("error", "An error occurred while sending the email.");
      //     return res.redirect("/user/signup");
      //   }

      //   console.log("Email sent:", info.response);
      //   req.flash(
      //     "success",
      //     "An email has been sent with instructions to verify your email address."
      //   );

      // Redirect to the previous URL
      if (req.session.oldUrl) {
        const oldUrl = req.session.oldUrl;
        req.session.oldUrl = null;
        res.redirect(oldUrl);
      } else {
        res.redirect("/user/signin");
      }
      // });
    } catch (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/");
    }
  }
);

// Displaying the forgot page after selecting forgot password
router.get("/forgot", middleware.isNotLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  res.render("user/forgot", {
    csrfToken: req.csrfToken(),
    successMsg,
    errorMsg,
    pageName: "Forgot Password",
  });
});

router.get("/emailVerification", middleware.isNotLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  res.render("user/emailVerification", {
    csrfToken: req.csrfToken(),
    successMsg,
    errorMsg,
    pageName: "Email Verification",
  });
});

// GET: display the signin form with csrf token
router.get("/signin", middleware.isNotLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  res.render("user/signin", {
    csrfToken: req.csrfToken(),
    errorMsg,
    successMsg,
    pageName: "Sign In",
  });
});

router.get("/passwordReset", middleware.isNotLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  try {
    const token = req.query.token;
    console.log("token is " + token);
    // Find the user with the matching reset password token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("error finding the user");
      req.flash("error", "Invalid or expired password reset token.");
      return res.redirect("/user/forgot");
    }
    res.render("user/passwordReset", {
      token,
      csrfToken: req.csrfToken(),
      pageName: "Reset Password",
      errorMsg,
      successMsg,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "An error occurred while processing your request.");
    res.redirect("user/forgot");
  }
  console.log("It finished here");
});

// POST: Handle the forgot password logic
router.post("/forgot", middleware.isNotLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      console.log("error at finding the user:- " + err);
      req.flash("error", "No user found with that email address.");
      return res.redirect("user/forgot");
    }

    // Store the token and its expiration time in the user's document
    user.generatePasswordReset();
    await user.save((err) => {
      if (err) {
        console.log("error at saving the user:- " + err);
        return res.redirect("user/forgot");
      }
    });

    // Send the password reset email to the user
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      service: "Gmail",
      secure: false,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: user.email,
      subject: "Password Reset",
      text:
        "You are receiving this email because you (or someone else) has requested the reset of the password for your account.\n\n" +
        "Please click on the following link, or paste it into your browser to complete the process:\n\n" +
        `http://${req.headers.host}/user/passwordReset/?token=${user.resetPasswordToken}\n\n` +
        "If you did not request this, please ignore this email and your password will remain unchanged.\n",
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        req.flash("error", "An error occurred while sending the email.");
        return res.redirect("/user/forgot");
      }

      console.log("Email sent:", info.response);
      req.flash(
        "success",
        "An email has been sent with instructions to reset your password."
      );
      res.redirect("/user/forgot");
    });
  } catch (error) {
    console.log(error);
    req.flash("error", "An error occurred. Please try again.");
    res.redirect("/user/forgot");
  }
});

router.post("/passwordReset", middleware.isNotLoggedIn, async (req, res) => {
  try {
    if (req.body.password !== req.body.password2) {
      req.flash("error", "Oops! Passwords do not match. Please try again!");
      return res.redirect(`/user/passwordReset/?token=${req.query.token}`);
    }

    const user = await User.findOne({
      resetPasswordToken: req.query.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/user/forgot");
    }

    // Update the user's password
    user.password = user.encryptPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    req.flash("success", "Your password has been successfully updated.");
    res.redirect("/user/signin");
  } catch (err) {
    console.log("Error while processing:", err);
    res.redirect(`/user/passwordReset/?token=${req.query.token}`);
  }
});

// POST: handle the signin logic
router.post(
  "/signin",
  [
    middleware.isNotLoggedIn,
    userSignInValidationRules(),
    validateSignin,
    passport.authenticate("local.signin", {
      failureRedirect: "/user/signin",
      failureFlash: true,
    }),
  ],
  async (req, res) => {
    try {
      // cart logic when the user logs in
      let cart = await Cart.findOne({ user: req.user._id });
      console.log(req.user);

      // if there is a cart session and user has no cart, save it to the user's cart in db
      if (req.session.cart && !cart) {
        cart = new Cart(req.session.cart);
        cart.user = req.user._id;
        await cart.save();
      }

      // if the user has a cart in the database, load it to the session
      if (cart) {
        req.session.cart = cart;
      }

      // redirect to the previous URL
      if (req.session.oldUrl) {
        const oldUrl = req.session.oldUrl;
        req.session.oldUrl = null;
        res.redirect(oldUrl);
      } else {
        res.redirect("/user/profile");
      }
    } catch (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/");
    }
  }
);

// POST: handle email verification
router.post(
  "/emailVerification",
  middleware.isNotLoggedIn,
  async (req, res) => {
    try {
      // Find the user with the given Email
      const user = await User.findOne({ email: req.body.email });

      // Add a null check to handle the case where user is undefined
      if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/user/emailVerification");
      }

      console.log(req.body.email);
      console.log(user);
      // Generate a new verification token
      user.generateEmailVerificationToken();

      // Save the updated user data
      await user.save();

      // Send the verification email to the user
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        service: "Gmail",
        secure: false,
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: user.email,
        subject: "Email Verification",
        text:
          "Thank you for signing up. Please click on the following link to verify your email:\n\n" +
          `http://${req.headers.host}/user/verify/?token=${user.emailVerificationToken}\n\n` +
          "If you did not sign up for this account, please ignore this email.\n",
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          req.flash(
            "error",
            "An error occurred while sending the verification email."
          );
          return res.redirect("/user/emailVerification");
        }

        console.log("Verification email sent:", info.response);
        req.flash(
          "success",
          "A verification email has been sent. Please check your inbox."
        );
        res.redirect("/user/emailVerification");
      });
    } catch (error) {
      console.log(error);
      req.flash("error", "An error occurred. Please try again.");
      res.redirect("/user/emailVerification");
    }
  }
);

// GET: handle email verification
router.get("/verify", async (req, res) => {
  try {
    const token = req.query.token;

    // Find the user with the matching verification token
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      req.flash("error", "Invalid verification token.");
      return res.redirect("/");
    }

    // Mark the user's email as verified and remove the verification token
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    req.flash("success", "Email verification successful. You can now log in.");
    res.redirect("/user/signin");
  } catch (error) {
    console.error(error);
    req.flash(
      "error",
      "An error occurred while processing the verification request."
    );
    res.redirect("/");
  }
});

// GET: display user's profile
router.get("/profile", middleware.isLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  try {
    // find all orders of this user
    allOrders = await Order.find({ user: req.user });
    res.render("user/profile", {
      orders: allOrders,
      errorMsg,
      successMsg,
      pageName: "User Profile",
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/");
  }
});

// GET: logout
router.get("/logout", middleware.isLoggedIn, (req, res) => {
  req.logout();
  req.session.cart = null;
  res.redirect("/");
});
module.exports = router;
