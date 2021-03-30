module.exports = function (app) {
  const payment = require("../controllers/paymentController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.post("/payments", jwtMiddleware, payment.insertOrderInfo);
  app.post("/payments/complete", payment.payment);
};
