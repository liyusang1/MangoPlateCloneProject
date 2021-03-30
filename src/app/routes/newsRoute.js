module.exports = function (app) {
  const news = require("../controllers/newsController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/reviews", jwtMiddleware, news.getAllReviews);
  app.post("/reviews", jwtMiddleware, news.addReview);
  app.get("/reviews/:reviewId", jwtMiddleware, news.getReview);
  app.patch("/reviews/:reviewId", jwtMiddleware, news.updateReview);
  app.patch("/reviews/:reviewId/status", jwtMiddleware, news.deleteReview);
  app.patch("/reviews/:reviewId/like", jwtMiddleware, news.reviewLike);
  app.post("/reviews/:reviewId/replies", jwtMiddleware, news.addReply);
  app.patch("/reviews/:reviewId/replies/:replyId", jwtMiddleware, news.updateReply);
  app.patch("/reviews/:reviewId/replies/:replyId/status", jwtMiddleware, news.deleteReply);
};
