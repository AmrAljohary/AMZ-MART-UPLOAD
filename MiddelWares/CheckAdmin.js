const checkAdmin = (options = {}) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      res.set(
        "Cache-Control",
        "no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0"
      );

      next();
    } else {
      const statusCode = options.statusCode || 403;
      const message =
        options.message ||
        "You do not have permission to access this resource.";
      if (options.redirect) {
        // Redirect unauthorized users to a specific page
        return res.redirect("/auth/login"); // Customize the URL as needed
      } else {
        // Return an error response
        return res.status(statusCode).json({ message });
      }
    }
  };
};

module.exports = checkAdmin;
