const adminOnly = (req, res, next) => {
  if (req.faculty?.role !== "admin") {
    console.log("Unauthorized access attempt by user with role:", req.faculty?.role);
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
};

module.exports = adminOnly;