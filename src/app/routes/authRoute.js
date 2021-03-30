module.exports = function (app) {
  const auth = require("../controllers/authController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  // app.post("/token", auth.getToken);
  app.post("/kakao-login", auth.kakaoLogIn);
  app.post("/facebook-login", auth.facebookLogIn);
};
