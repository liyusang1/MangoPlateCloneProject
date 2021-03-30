const { pool } = require("../../../config/database");

//잇딜 가져오기 지역 필터링
async function getEatDeal(location, page, limit) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getEatDealQuery = `
  select EatDeal.eatDealId,
         firstImageUrl,eatDealDiscount,eatDealBeforePrice,eatDealAfterPrice,
         eatDealName,eatDealOneLine,eatDealPickUpPossible

         from EatDeal
         inner join Restaurant on EatDeal.restaurantId = Restaurant.restaurantId
         left outer join (select EatDealImg.eatDealId, eatDealImgUrl as firstImageUrl
                     from EatDealImg
                              inner join (select eatDealId, min(imgId) as firstImageId
                                          from EatDealImg
                                          group by eatDealId) firstImage
                                         on EatDealImg.imgId = firstImage.firstImageId where EatDealImg.status = 1) EatDealImages
                    on EatDeal.eatDealId = EatDealImages.eatDealId

 where SUBSTRING_INDEX(SUBSTRING_INDEX(Restaurant.restaurantLocation, " ", 2), " ", -1) in (?) and EatDeal.status = 1
 limit ?,?;
                  `;
  const eatDealParams = [location, page, limit]                
  const [getEatDealRows] = await connection.query(getEatDealQuery,eatDealParams);
  connection.release();

  return getEatDealRows;
}

//모든 잇딜 가져오기
async function getAllEatDeal(getEatDealParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getAllEatDealQuery = `
  select EatDeal.eatDealId,
         firstImageUrl,eatDealDiscount,eatDealBeforePrice,eatDealAfterPrice,
         eatDealName,eatDealOneLine,eatDealPickUpPossible

         from EatDeal
         inner join Restaurant on EatDeal.restaurantId = Restaurant.restaurantId
         left outer join (select EatDealImg.eatDealId, eatDealImgUrl as firstImageUrl
                     from EatDealImg
                              inner join (select eatDealId, min(imgId) as firstImageId
                                          from EatDealImg
                                          group by eatDealId) firstImage
                                         on EatDealImg.imgId = firstImage.firstImageId where EatDealImg.status = 1) EatDealImages
                    on EatDeal.eatDealId = EatDealImages.eatDealId

 where EatDeal.status = 1
 limit ?,?;
                  `;         
  const [getAllEatDealRows] = await connection.query(getAllEatDealQuery,getEatDealParams);
  connection.release();

  return getAllEatDealRows;
}

//잇딜 체크
async function checkEatDealId(eatDealId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkEatDealIdQuery = `
 
  select eatDealName from EatDeal where status = 1 and eatDealId = ?

                  `;         
  const [checkEatDealIdRows] = await connection.query(checkEatDealIdQuery,eatDealId);
  connection.release();

  return checkEatDealIdRows;
}

//잇딜 상세정보 조회
async function getEatDealDetail(eatDealId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getEatDealDetailQuery = `
 
  select concat(eatDealOneLine,' ',eatDealDiscount,'% 할인' ) as message,
       eatDealName,restaurantId,eatDealOneLine,eatDealTerm,
       eatDealBeforePrice,eatDealAfterPrice,eatDealDiscount,eatDealPickUpPossible,
       restaurantInfo,menuInfo,noticeInfo,howToUseInfo,refundPolicyInfo

from EatDeal where eatDealId = ?;
  
                  `;         
  const [getEatDealDetailRows] = await connection.query(getEatDealDetailQuery,eatDealId);
  connection.release();

  return getEatDealDetailRows;
}

//잇딜 상세정보 조회
async function getEatDealImg(eatDealId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const  getEatDealImgQuery = `
 
  select eatDealId,imgId,eatDealImgUrl from EatDealImg where eatDealId = ?;
  
                  `;         
  const [getEatDealImgRows] = await connection.query(getEatDealImgQuery,eatDealId);
  connection.release();

  return getEatDealImgRows;
}

//유저 위도 경도 설정
async function setUserLocation(userLocationParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const setUserLocationQuery = `
 
  set    @userLatitude :=?,  
         @userLongtitude :=?;
  
                  `;         
  const [setUserLocationRows] = await connection.query(setUserLocationQuery,userLocationParams);
  connection.release();

  return setUserLocationRows;
}

//유저 주변 잇딜 가져오기
async function getEatDealFromUserLocation(pagingParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getEatDealFromUserLocationQuery = `
 
  select EatDeal.eatDealId,firstImageUrl,eatDealDiscount,eatDealBeforePrice,eatDealAfterPrice,
       eatDealName,eatDealOneLine,eatDealPickUpPossible,

       round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians( @userLongtitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser'

       from EatDeal
       inner join Restaurant on EatDeal.restaurantId = Restaurant.restaurantId
       left outer join (select EatDealImg.eatDealId, eatDealImgUrl as firstImageUrl
                     from EatDealImg
                              inner join (select eatDealId, min(imgId) as firstImageId
                                          from EatDealImg
                                          group by eatDealId) firstImage
                                         on EatDealImg.imgId = firstImage.firstImageId where EatDealImg.status = 1) EatDealImages
                    on EatDeal.eatDealId = EatDealImages.eatDealId
 where EatDeal.status = 1
 having distanceFromUser < 3 -- 유저 기준 3키로 이하
 limit ?,?;
                  `;         
  const [getEatDealFromUserLocationRows] = await connection.query(getEatDealFromUserLocationQuery,pagingParams);
  connection.release();

  return getEatDealFromUserLocationRows;
}

//TopList 전부 제공
async function getAllTopListInfo(topListParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getAllTopListInfoQuery = `
 
  select TopList.topListId,topListImgUrl,
       topListView,
       CASE
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()) > 7, date_format(TopList.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()), " 일 전"))
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, TopList.updatedAt, now()), " 분 전")
           ELSE concat(TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()), " 시간 전")
       END AS updatedAt,
       ifnull(userBookMark,0) as userBookMark,


       topListName,topListOneLine from TopList
         -- 유저가 북마크 표시를 했는지
        left outer join (select topListId, count(*) as userBookMark from TopListBookMark where userId = ? and status = 1
        group by topListId) UserBookMark
        on TopList.topListId = UserBookMark.topListId
order by topListView desc
limit ?,?;
                  `;         
  const [getAllTopListInfoRows] = await connection.query(getAllTopListInfoQuery,topListParams);
  connection.release();

  return getAllTopListInfoRows;
}

//탑리스트북마크 체크
async function checkTopListBookMark(topListParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkTopListBookMarkQuery = `
 
  select * from TopListBookMark where topListId =? and userId =?;
  
                  `;         
  const [checkTopListBookMarkRows] = await connection.query(checkTopListBookMarkQuery,topListParams);
  connection.release();

  return checkTopListBookMarkRows;
}

//탑리스트북마크 생성
async function postTopListBookMark(topListParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const postTopListBookMarkQuery = `
 
  insert into TopListBookMark (topListId,userId,status) values (?, ?,1);
  
                  `;         
  const [postTopListBookMarkRows] = await connection.query(postTopListBookMarkQuery,topListParams);
  connection.release();

  return postTopListBookMarkRows;
}

//탑리스트북마크 상태값 변경
async function patchTopListBookMark(topListParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const patchTopListBookMarkQuery = `
 
 update TopListBookMark set status= if(status = 1, 0, 1)
        where topListId=? and userId = ? ;   

                  `;         
  const [patchTopListBookMarkRows] = await connection.query(patchTopListBookMarkQuery,topListParams);
  connection.release();

  return patchTopListBookMarkRows;
}

//탑리스트 체크
async function checkTopList(topListId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkTopListQuery = `
 
  select * from TopList where topListId = ?;
  
                  `;         
  const [checkTopListRows] = await connection.query(checkTopListQuery,topListId);
  connection.release();

  return checkTopListRows;
}

//탑리스트 정보부분 가져오기
async function getTopListDetailInfo(topListParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getTopListDetailInfoQuery = `
 
  select
       topListName,
       topListView,
       CASE
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()) > 7, date_format(TopList.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()), " 일 전"))
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, TopList.updatedAt, now()), " 분 전")
           ELSE concat(TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()), " 시간 전")
       END AS updatedAt, topListOneLine,
       ifnull(userBookMark,0) as userBookMark


     from TopList
         -- 유저가 북마크 표시를 했는지
        left outer join (select topListId, count(*) as userBookMark from TopListBookMark where userId = ? and status = 1
        group by topListId) UserBookMark
        on TopList.topListId = UserBookMark.topListId
        where TopList.topListId= ?;
  
                  `;         
  const [checkTopListRows] = await connection.query(getTopListDetailInfoQuery,topListParams);
  connection.release();

  return checkTopListRows;
}

//탑리스트 식당 부분 가져오기
async function getTopListDetailRestaurant(topListParams2) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getTopListDetailRestaurantQuery = `

  select
       Restaurant.restaurantId,
       firstImageUrl,ifnull(userLike,0) as userLike,
       restaurantName,
       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView <  10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
       end
           as star,
       restaurantLocation,
       RestaurantReviews.userId,userName,userProfileImgUrl,firstReview

       from TopListContents
         inner join Restaurant on Restaurant.restaurantId = TopListContents.restaurantId

         -- 식당 사진 부분
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

          -- 식당 리뷰 한개 부분
        left outer join (select Review.restaurantId,Review.userId, reviewContents as firstReview
                     from Review
                              inner join (select restaurantId,Review.userId, min(reviewId) as firstReviewId
                                          from Review -- where reviewExpression...추후결정
                                          group by restaurantId) FirstReview
                                         on Review.reviewId = FirstReview.firstReviewId) RestaurantReviews
                    on Restaurant.restaurantId = RestaurantReviews.restaurantId


        -- 유저가 식당을 좋아요 했는지
        left outer join (select restaurantId, count(*) as userLike from RestaurantLike where userId = ? and status = 1
        group by restaurantId) UserLike
        on Restaurant.restaurantId = UserLike.restaurantId

       inner join User on RestaurantReviews.userId = User.userId
       where TopListContents.topListId = ?
limit ?,?;
                  `;         
  const [getTopListDetailRestaurantRows] = await connection.query(getTopListDetailRestaurantQuery,topListParams2);
  connection.release();

  return getTopListDetailRestaurantRows;
}

//topList 상세조회api를 실행할 때 마다 조회 수 +1
async function plusTopListView(topListId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const plusTopListViewQuery = `

  -- 상세조회 할 때 조회 수 플러스 1
  update TopList set topListView = topListView + 1 where topListId = ? ;

                `;
  const [plusTopListViewRows] = await connection.query(plusTopListViewQuery,topListId);
  connection.release();

  return plusTopListViewRows;
}

//다른 맛집 리스트 제공 limit 6
async function getOtherTopList(id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const otherTopListQuery = `

  select TopList.topListId,
       topListImgUrl,
       topListView,
       CASE
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()) > 7, date_format(TopList.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, TopList.updatedAt, now()), " 일 전"))
           WHEN TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, TopList.updatedAt, now()), " 분 전")
           ELSE concat(TIMESTAMPDIFF(HOUR, TopList.updatedAt, now()), " 시간 전")
       END AS updatedAt,
       ifnull(userBookMark,0) as userBookMark,


       topListName,topListOneLine from TopList
         -- 유저가 북마크 표시를 했는지
        left outer join (select topListId, count(*) as userBookMark from TopListBookMark where userId = ? and status = 1
        group by topListId) UserBookMark
        on TopList.topListId = UserBookMark.topListId
order by updatedAt asc
limit 6;

                `;
  const [otherTopListRows] = await connection.query(otherTopListQuery,id);
  connection.release();

  return otherTopListRows;
}

//디바이스 토큰 가져오기
async function getDeviceToken(id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getDeviceTokenQuery = `

  select deviceToken,userName from User where userId = ?

                `;
  const [getDeviceTokenRows] = await connection.query(getDeviceTokenQuery,id);
  connection.release();

  return getDeviceTokenRows;
}



module.exports = {
  getEatDeal,
  getAllEatDeal,
  checkEatDealId,
  getEatDealDetail,
  getEatDealImg,
  setUserLocation,
  getEatDealFromUserLocation,
  getAllTopListInfo,
  checkTopListBookMark,
  postTopListBookMark,
  patchTopListBookMark,
  checkTopList,
  getTopListDetailInfo,
  getTopListDetailRestaurant,
  plusTopListView,
  getOtherTopList,
  getDeviceToken
};
