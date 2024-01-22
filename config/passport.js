const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user");
const nodemailer = require("nodemailer");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  "local.signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const user = await User.findOne({ email: email });
        if (user) {
          return done(null, false, { message: "Email already exists" });
        }
        if (password !== req.body.password2) {
          return done(null, false, { message: "Passwords must match" });
        }
        const newUser = new User();
        newUser.email = email;
        newUser.password = newUser.encryptPassword(password);
        newUser.username = req.body.name;
        newUser.isEmailVerified = false; // Set initial email verification status
        newUser.generateEmailVerificationToken(); // Generate verification token
        await newUser.save();

        // Send verification email
        const transporter = nodemailer.createTransport({
          // Configure your email transport settings here (e.g., SMTP or other)
          // See nodemailer documentation for more information
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
          from: process.env.GMAIL_EMAIL, // Replace with your email address
          to: newUser.email,
          subject: "Email Verification",
          text:
            `Thank you for signing up! Please verify your email address by clicking on the following link:\n\n` +
            `http://${req.headers.host}/user/verify?token=${newUser.emailVerificationToken}\n\n` +
            "If you did not sign up for this account, please ignore this email.\n",
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            // Handle error while sending email
            return done(null, false, {
              message: "An error occurred while sending the email.",
            });
          } else {
            console.log("Email sent: " + info.response);
            // Handle success sending email
            return done(null, false, {
              message:
                "An email has been sent with instructions to verify your email address.",
            });
          }
        });

        return done(null, false, {
          message:
            "Signup successful. Please check your email for verification.",
        });
      } catch (error) {
        console.log(error);
        return done(error);
      }
    }
  )
);

passport.use(
  "local.signin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email });
        if (!user) {
          return done(null, false, { message: "User doesn't exist" });
        }
        if (!user.validPassword(password)) {
          return done(null, false, { message: "Wrong password" });
        }
        if (!user.isEmailVerified) {
          return done(null, false, {
            message: "Email not verified. Please verify your email.",
          });
        }
        return done(null, user);
      } catch (error) {
        console.log(error);
        return done(error);
      }
    }
  )
);

module.exports = passport;
