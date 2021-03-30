module.exports = function (app) {
  const eatDeal = require("../controllers/eatDealController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  //잇딜 지역 필터
  app.get("/eat-deals", jwtMiddleware, eatDeal.getEatDeal);
  //잇딜 전체 조회
  app.get("/eat-deals-all", jwtMiddleware, eatDeal.getAllEatDeal);
  //잇딜 내주변
  app.get("/eat-deals/users", jwtMiddleware, eatDeal.getEatDealFromUser);
  //잇딜 상세조회
  app.get("/eat-deals/:eatDealId", jwtMiddleware, eatDeal.getEatDealDetail);

  
  // toplist 전체조회
  app.get("/top-list", jwtMiddleware, eatDeal.getAllTopList);
  // toplist북마크 생성
  app.patch("/top-list/:topListId", jwtMiddleware, eatDeal.patchTopList);
  // toplist 상세조회
  app.get("/top-list/:topListId",jwtMiddleware, eatDeal.getTopListDetail);

  
  //pushAlarm test
  app.get("/push", jwtMiddleware,eatDeal.pushAlarm);

};
