const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, "RANDOM-TOKEN");
    req.user = {
      userId: decodedToken.userId,
      userEmail: decodedToken.userEmail,
    };
    next();
  } catch (error) {
    console.log("JWT verify error:", error.message); 
    res.status(401).json({
      error: new Error("Invalid Request!"),
    });
  }
};
