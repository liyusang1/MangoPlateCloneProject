module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/users/:userId", user.getProfile);
  app.patch("/users/:userId", jwtMiddleware, user.updateProfile);
  app.get("/users/:userId/follwer", user.getfollwer);
  app.get("/users/:userId/follwing", user.getfollwing);
  app.patch("/users/:userId/status", jwtMiddleware, user.withdrawal);
  app.patch("/following/users/:userId", jwtMiddleware, user.patchfollwing);
};
