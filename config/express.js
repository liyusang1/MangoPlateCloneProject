const express = require("express");
const compression = require("compression");
const methodOverride = require("method-override");

var cors = require("cors");
module.exports = function () {
  const app = express();

  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride());
  app.use(cors());

  /* App (Android, iOS) */
  require("../src/app/routes/userRoute")(app);
  require("../src/app/routes/restaurantRoute")(app);
  require("../src/app/routes/authRoute")(app);
  require("../src/app/routes/newsRoute")(app);
  require("../src/app/routes/eatDealRoute")(app);
  require("../src/app/routes/paymentRoute")(app);

  return app;
};
