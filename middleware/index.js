const middlewareObject = {};

// a middleware to check if a user is logged in or not
middlewareObject.isNotLoggedIn = (req, res, next) => {
  console.log("its from middleware:");
  console.log(req.user);
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};

middlewareObject.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/user/signin");
};

module.exports = middlewareObject;
