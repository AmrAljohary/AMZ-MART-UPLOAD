const checkAuth = (options = {}) => {
  return (req, res, next) => {
    if (req.isAuthenticated()) {
      res.set(
        "Cache-Control",
        "no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0"
      );

      next();
    } else {
      const statusCode = options.statusCode || 401;
      const message = options.message || "Please login to continue.";
      if (options.redirect) {
        // Redirect unauthenticated users to a login page
        return res.redirect("/auth/login"); // Customize the URL as needed
      } else {
        // Return an error response
        return res.status(statusCode).json({ message });
      }
    }
  };
};

module.exports = checkAuth;
