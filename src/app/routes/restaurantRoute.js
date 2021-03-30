module.exports = function (app) {
  const restaurant = require("../controllers/restaurantController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/restaurants",jwtMiddleware,restaurant.getAllRestaurant);
  app.post("/restaurants",jwtMiddleware,restaurant.enrollRestaurant);

  app.patch("/restaurants/:restaurantId/like",jwtMiddleware,restaurant.likeRestaurant);

  app.get("/restaurants/:restaurantId",jwtMiddleware,restaurant.restaurantDetail);

  app.get("/reviews/images/:imgId",jwtMiddleware,restaurant.getImagesDetail);

  app.get("/restaurants/:restaurantId/visited",jwtMiddleware,restaurant.visitedInfo );
  app.post("/restaurants/:restaurantId/visited",jwtMiddleware,restaurant.enrollVisited);

  app.get("/search-restaurants",jwtMiddleware,restaurant.searchRestaurant);

};
