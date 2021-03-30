const { pool } = require("../../../config/database");

//탑리스트 조회
async function topListInfo() {
  const connection = await pool.getConnection(async (conn) => conn);
  const topListInfoQuery = `

  select topListId,topListImgUrl,topListName from TopList limit 5;

                `;
  const [showTopListInfo] = await connection.query(topListInfoQuery);
  connection.release();

  return showTopListInfo;
}

//정렬기준 변수 설정
async function setSort(sort) {
  const connection = await pool.getConnection(async (conn) => conn);
  const setSortQuery = `

  set @sort := ?;

                `;
  const [showsetSortInfo] = await connection.query(setSortQuery, sort);
  connection.release();

  return showsetSortInfo;
}

//유저 위도경도 설정
async function setUserLocation(setUserLocationParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const setUserLocationQuery = `

  set @userLatitude := ?,@userLongitude := ?;

                `;
  const [setUserLocationInfo] = await connection.query(setUserLocationQuery, setUserLocationParams);
  connection.release();

  return setUserLocationInfo;
}

//모든 식당 조회 필터 없음. //
//-- order by star,reviewCount, distance
async function allRestaurantInfo(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,

        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

       SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,

       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where Restaurant.status = 1 and Restaurant.inspection = 1 and SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?)
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 메뉴필터x 가격필터x 가고싶다 필터0.
async function allRestaurantInfoLike(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
      
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
    
       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        inner join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status =2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where Restaurant.status = 1 and Restaurant.inspection = 1 and SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?)
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 메뉴필터x 가격필터x 가봤어요 필터0.
async function allRestaurantInfoVisited(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
      
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
  
       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        inner join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where Restaurant.status = 1 and Restaurant.inspection = 1 and SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) 
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by 메뉴 filter
async function allRestaurantInfoByMenuFilter(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
    
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1  
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2  
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and restaurantFilter in (?) and Restaurant.status = 1 and Restaurant.inspection = 1
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by 메뉴 filter 가고싶다 필터
async function allRestaurantInfoByMenuFilterLike(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
  
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
    
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        inner join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1  
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2    
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and restaurantFilter in (?) and Restaurant.status = 1 and Restaurant.inspection = 1
   
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by 메뉴 filter 가봤어요 필터
async function allRestaurantInfoByMenuFilterVisited(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
       
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1  
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        inner join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and restaurantFilter in (?) and Restaurant.status = 1 and Restaurant.inspection = 1
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by price filter  1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByPriceFilter(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,

        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and Restaurant.inspection = 1
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by price filter 가고싶다 필터
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByPriceFilterLike(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
      
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,

       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        inner join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and Restaurant.inspection = 1
    
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by price filter 가봤어요 필터
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByPriceFilterVisited(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         inner join Area
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        inner join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and Restaurant.inspection = 1
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by menu price filter
//레스토랑 필터 1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByMenuPriceFilter(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
       
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and restaurantFilter in (?) and Restaurant.inspection = 1
  
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by menu price filter 가고싶다 필터
//레스토랑 필터 1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByMenuPriceFilterLike(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,
        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        inner join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and restaurantFilter in (?) and Restaurant.inspection = 1
    
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

//모든 식당 조회 by menu price filter 가봤어요 필터
//레스토랑 필터 1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점
//레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
async function allRestaurantInfoByMenuPriceFilterVisited(showAllRestaurantInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const allRestaurantInfoQuery = `
  select
       Restaurant.restaurantId,
       restaurantName,

        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

           SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        inner join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2   
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?) and Restaurant.status = 1 and restaurantPriceFilter in (?) and restaurantFilter in (?) and Restaurant.inspection = 1
  
    having distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else restaurantView
              END DESC
limit ?,?;
                `;
  const [showAllRestaurantInfo] = await connection.query(allRestaurantInfoQuery, showAllRestaurantInfoParams);
  connection.release();

  return showAllRestaurantInfo;
}

// 식당 등록
async function insertRestaurant(insertRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertRestaurantQuery = `
            INSERT INTO Restaurant (restaurantName, restaurantLocation, restaurantLatitude, restaurantLongitude, restaurantPhoneNumber, restaurantFilter, restaurantEnrollUserId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
  const [insertRestaurantRows] = await connection.query(insertRestaurantQuery, insertRestaurantParams);
  connection.release();

  return insertRestaurantRows;
}

//식당 가고싶다 표시가 되어있는지 체크
async function checkRestaurantLike(likeRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkRestaurantLikeQuery = `

  select status from RestaurantLike where restaurantId = ? and userId = ?

                `;
  const [checkRestaurantLikeRows] = await connection.query(checkRestaurantLikeQuery, likeRestaurantParams);
  connection.release();

  return [checkRestaurantLikeRows];
}

//식당 가고싶다 post 하기
async function postRestaurantLike(likeRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const postRestaurantLikeQuery = `

  INSERT INTO RestaurantLike (restaurantId,userId)
  VALUES (?, ?)

                `;
  const [postRestaurantLikeRows] = await connection.query(postRestaurantLikeQuery, likeRestaurantParams);
  connection.release();

  return postRestaurantLikeRows;
}

//식당 가고싶다 표시 off하기
async function changeRestaurantLikeOff(likeRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const changeRestaurantLikeOffQuery = `

  update RestaurantLike set status=0 
  where restaurantId = ? and userId = ?;

                `;
  const [changeRestaurantLikeOffRows] = await connection.query(changeRestaurantLikeOffQuery, likeRestaurantParams);
  connection.release();

  return changeRestaurantLikeOffRows;
}

//식당 가고싶다 표시 on하기
async function changeRestaurantLikeOn(likeRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const changeRestaurantLikeOnQuery = `

  update RestaurantLike set status=1
  where restaurantId = ? and userId = ?;

                `;
  const [changeRestaurantLikeOnRows] = await connection.query(changeRestaurantLikeOnQuery, likeRestaurantParams);
  connection.release();

  return changeRestaurantLikeOnRows;
}

//식당 상세조회 부분

//식당 상세조회 api를 실행할 때 마다 식당 조회 수 +1
async function plusRestaurantView(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const plusRestaurantViewQuery = `

  -- 식당 상세조회 할 때 조회 수 플러스 1
  update Restaurant set restaurantView = Restaurant.restaurantView + 1 where restaurantId = ? ;

                `;
  const [plusRestaurantViewQueryRows] = await connection.query(plusRestaurantViewQuery, restaurantId);
  connection.release();

  return plusRestaurantViewQueryRows;
}

//식당 상세조회의 이미지 가져오기 쿼리 부분
async function getRestaurantImg(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantImgQuery = `

  select imgId,reviewImgUrl
  from ReviewImg where restaurantId = ? limit 4;

                `;
  const [getRestaurantImgQueryRows] = await connection.query(getRestaurantImgQuery, restaurantId);
  connection.release();

  return getRestaurantImgQueryRows;
}

//식당 상세조회의 식당 상세 정보 쿼리 부분.
async function getRestaurantDetailInfo(restaurantDetailParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantDetailInfoQuery = `

  select
       inspection,Restaurant.restaurantId,restaurantName,
       -- 임시알고리즘
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
       restaurantView,
       ifnull(likeCount, 0) as likeCount,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(userLike, 0) as userLike,
       ifnull(uservisited,0) as uservisited,
       ifnull(restaurantInfo,-1) as restaurantInfo ,

       restaurantLocation,restaurantLatitude,restaurantLongitude,ifnull(restaurantPhoneNumber,-1) as restaurantPhoneNumber ,
       ifnull(restaurantTime,-1) as restaurantTime,ifnull(restaurantHoliday,-1) as restaurantHoliday,
       ifnull(restaurantRestTime,-1) as restaurantRestTime,ifnull(restaurantPrice,-1) as restaurantPrice,ifnull(restaurantMenu,-1) as restaurantMenu

   from Restaurant
        -- 식당 좋아요 수 전체 수
        left outer join (select restaurantId, count(*) as likeCount from RestaurantLike where status = 1 and restaurantId = ? group by restaurantId )RestaurantLike -- 식당 아이디 변경
        on Restaurant.restaurantId = RestaurantLike.restaurantId
        -- 식당 리뷰 수
        left outer join (select restaurantId, count(*) as reviewCount from Review where status = 1 and restaurantId = ? group by restaurantId )RestaurantReview -- 식당 아이디 변경
        on Restaurant.restaurantId = RestaurantReview.restaurantId
        -- 유저가 식당을 좋아요 했는지
        left outer join (select restaurantId, count(*) as userLike from RestaurantLike where userId = ? and status = 1 
        group by restaurantId) UserLike
        on Restaurant.restaurantId = UserLike.restaurantId
        -- 유저가 식당을 몇번 방문 했었는지
        left outer join (select restaurantId, count(*) as uservisited from RestaurantVisited where userId = ? and status = 1 or status =2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

where Restaurant.restaurantId = ?;

                `;
  const [getRestaurantDetailInfoRows] = await connection.query(getRestaurantDetailInfoQuery, restaurantDetailParams);
  connection.release();

  return getRestaurantDetailInfoRows;
}

//식당 상세조회의 메뉴 이미지 가져오기
async function getRestaurantMenuImg(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantMenuImgQuery = `

  select restaurantMenuImgUrl from RestaurantMenuImg where restaurantId = ? ;

                `;
  const [getRestaurantImgRows] = await connection.query(getRestaurantMenuImgQuery, restaurantId);
  connection.release();

  return getRestaurantImgRows;
}

//식당 상세조회의 리뷰 갯수 가져오기 쿼리 부분
async function getRestaurantReviewCount(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantReviewCountQuery = `

  select
count(Review.reviewId) as reviewCount,
       count(case when Review.reviewExpression=2 then 1 end) as deliciousCount,
       count(case when Review.reviewExpression=1 then 1 end) as okayCount,
       count(case when Review.reviewExpression=-1 then 1 end) as badCount
from Review where restaurantId = ?;

                `;
  const [getRestaurantReviewCountRows] = await connection.query(getRestaurantReviewCountQuery, restaurantId);
  connection.release();

  return getRestaurantReviewCountRows;
}

//식당 상세조회의 리뷰 정보 부분 쿼리
async function getRestaurantReview(restaurantReviewDetailParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantReviewQuery = `

  select Review.reviewId,

       userProfileImgUrl,userName,

       -- 홀릭은 그 유저가 리뷰 100개 쓰면 홀릭
       case
         when userReviewCount >= 10 then 1
         when userReviewCount < 10 then 0
       end as isHolic,
       case
           when reviewExpression = -1 then '별로'
           when reviewExpression = 1 then '괜찮다'
           when reviewExpression = 2 then '맛있다'
       end as reviewExpression,
       userReviewCount,
       ifnull(userFollower,0) as userFollower,
       reviewContents,
       ifnull(reviewLikeCount,0) as  reviewLikeCount,
        ifnull(reviewReplyCount,0) as reviewReplyCount,
       ifnull(userReviewLike,0) as userReviewLike,
       
    CASE
       WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) > 23
          THEN IF(TIMESTAMPDIFF(DAY, Review.updatedAt, now()) > 7, date_format(Review.updatedAt, '%Y-%m-%d'),
                  concat(TIMESTAMPDIFF(DAY, Review.updatedAt, now()), " 일 전"))
       WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) < 1
          THEN concat(TIMESTAMPDIFF(MINUTE, Review.updatedAt, now()), " 분 전")
       ELSE concat(TIMESTAMPDIFF(HOUR, Review.updatedAt, now()), " 시간 전")
    END AS updatedAt

from Review

    -- 리뷰를 작성한 사용자가 작성한 리뷰 개수가 몇개 인지
inner join User on Review.userId =User.userId
        left outer join (select userId, count(*) as userReviewCount from Review where status = 1
        group by userId) ReviewCount
        on ReviewCount.userId = User.userId
        -- 리뷰를 작성한 사람의 팔로워 수가 몇명인지
        left outer join (select targetUserId, count(*) as userFollower from Follow where status = 1
        group by targetUserId) Follower
        on ReviewCount.userId = User.userId and User.userId = Follower.targetUserId
        -- 리뷰의 좋아요 수가 몇개인지
        left outer join (select reviewId, count(*) as reviewLikeCount from ReviewLike where status = 1
        group by reviewId)ReviewLike
        on ReviewLike.reviewId = Review.reviewId

        -- 유저가 리뷰을 좋아요 했는지
        left outer join (select reviewId, count(*) as userReviewLike from ReviewLike where userId = ? and status = 1 
        group by reviewId) UserReviewLike
        on UserReviewLike.reviewId = Review.reviewId

        -- 리뷰 답글 개수 관련 쿼리
        left outer join (select reviewId, count(*) as reviewReplyCount from ReviewReply where status = 1 
        group by reviewId) Reply
        on Reply.reviewId = Review.reviewId

where restaurantId = ?;

                `;
  const [getRestaurantReviewRows] = await connection.query(getRestaurantReviewQuery, restaurantReviewDetailParams);
  connection.release();

  return getRestaurantReviewRows;
}

//식당 상세조회의 리뷰 부분 식당 이미지 가져오기 쿼리 부분
async function getRestaurantReviewImg(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantReviewImgQuery = `

  select imgId,reviewImgUrl from ReviewImg where reviewId = ? and status = 1;

                `;
  const [getRestaurantReviewImgRows] = await connection.query(getRestaurantReviewImgQuery, restaurantId);
  connection.release();

  return getRestaurantReviewImgRows;
}

//식당 상세조회의 키워드 가져오기 부분
async function getRestaurantKeyWord(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantKeyWordQuery = `

  select restaurantKeyWord from RestaurantKeyWord where restaurantId = ? and status = 1;

                `;
  const [getRestaurantKeyWordRows] = await connection.query(getRestaurantKeyWordQuery, restaurantId);
  connection.release();

  return getRestaurantKeyWordRows;
}

//식당 위도경도를 받아와서 변수에 저장함.
async function setRestaurantLocation(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const setRestaurantLocationQuery = `

  select @currentRestaurantLatitude := restaurantLatitude,
         @currentRestaurantLongitude := restaurantLongitude

       from Restaurant where restaurantId = ? ;

                `;
  const [setRestaurantLocationRows] = await connection.query(setRestaurantLocationQuery, restaurantId);
  connection.release();

  return setRestaurantLocationRows;
}

//식당을 기준으로 주변 식당 출력
async function getNearRestaurant(nearRestaurantParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getNearRestaurantQuery = `

  select
       Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(@currentRestaurantLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians( @currentRestaurantLongitude)) + sin(radians(@currentRestaurantLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromRestaurant',

       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review where status=1 group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId =? and status =1 
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId =? and status =1 or status = 2  
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where Restaurant.status = 1 and Restaurant.inspection = 1
    having distanceFromRestaurant > 0

    order by distanceFromRestaurant limit 4

                `;
  const [getNearRestaurantRows] = await connection.query(getNearRestaurantQuery, nearRestaurantParams);
  connection.release();

  return getNearRestaurantRows;
}

//식당의 현재 지역을 알려줌
async function getCurrentArea() {
  const connection = await pool.getConnection(async (conn) => conn);
  const getCurrentAreaQuery = `

  select areaName,
       round(6371 *
             acos(cos(radians(@currentRestaurantLatitude)) * cos(radians(areaLatitude)) * cos(radians(areaLongitude)
                 - radians( @currentRestaurantLongitude)) + sin(radians(@currentRestaurantLatitude)) * sin(radians(areaLatitude))), 2)
           AS 'distanceFromArea' from Area
  order by distanceFromArea limit 1;

                `;
  const [getCurrentAreaRows] = await connection.query(getCurrentAreaQuery);
  connection.release();

  return getCurrentAreaRows;
}

//식당이 존재하는지 체크
async function checkRestaurant(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkRestaurantQuery = `

  select restaurantName from Restaurant where restaurantId = ?;

                `;
  const [checkRestaurantRows] = await connection.query(checkRestaurantQuery, restaurantId);
  connection.release();

  return checkRestaurantRows;
}

//사진의 상세 정보 가져오기
async function imagesDetailInfo(imagesDetailParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const imagesDetailInfoQuery = `

  select restaurantName,Review.reviewId,
         userProfileImgUrl,userName,

       -- 홀릭은 그 유저가 리뷰 100개 쓰면 홀릭
       case
         when userReviewCount >= 10 then 1
         when userReviewCount < 10 then 0
       end as isHolic,
       userReviewCount,
       ifnull(userFollower,0) as userFollower,
       reviewImgUrl,reviewContents,
       ifnull(userReviewLike,0) as userReviewLike,
       CASE
          WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) > 23
             THEN IF(TIMESTAMPDIFF(DAY, Review.updatedAt, now()) > 7, date_format(Review.updatedAt, '%Y-%m-%d'),
                  concat(TIMESTAMPDIFF(DAY, Review.updatedAt, now()), " 일 전"))
          WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) < 1
            THEN concat(TIMESTAMPDIFF(MINUTE, Review.updatedAt, now()), " 분 전")
          ELSE concat(TIMESTAMPDIFF(HOUR, Review.updatedAt, now()), " 시간 전")
      END AS updatedAt
from Review

    -- 리뷰를 작성한 사용자가 작성한 리뷰 개수가 몇개 인지
inner join User on Review.userId =User.userId
    inner join ReviewImg on Review.reviewId = ReviewImg.reviewId
    inner join Restaurant on Review.restaurantId = Restaurant.restaurantId
    
        left outer join (select userId, count(*) as userReviewCount from Review where status = 1
        group by userId) ReviewCount
        on ReviewCount.userId = User.userId

        -- 리뷰를 작성한 사람의 팔로워 수가 몇명인지
        left outer join (select targetUserId, count(*) as userFollower from Follow where status = 1
        group by targetUserId) Follower
        on ReviewCount.userId = User.userId and User.userId = Follower.targetUserId

        -- 리뷰의 좋아요 수가 몇개인지
        left outer join (select reviewId, count(*) as reviewLikeCount from ReviewLike where status = 1
        group by reviewId)ReviewLike
        on ReviewLike.reviewId = Review.reviewId

        -- 유저가 리뷰을 좋아요 했는지
        left outer join (select reviewId, count(*) as userReviewLike from ReviewLike where userId = ? and status = 1
        group by reviewId) UserReviewLike
        on UserReviewLike.reviewId = Review.reviewId

where imgId = ?;

                `;
  const [imagesDetailInfoRows] = await connection.query(imagesDetailInfoQuery, imagesDetailParams);
  connection.release();

  return imagesDetailInfoRows;
}

//이미지 인덱스 체크
async function checkImagesDetail(imgId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkImagesDetailQuery = `

  select reviewId from ReviewImg where imgId = ?;

                `;
  const [checkImagesDetailRows] = await connection.query(checkImagesDetailQuery, imgId);
  connection.release();

  return checkImagesDetailRows;
}

//등록할 방문 정보 가져오기
async function getVisitedInfo(getVisitedInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getVisitedInfoQuery = `

  select
  Restaurant.restaurantId,
  concat(userName,'님이 ',restaurantName,'에 방문하였습니다.') as message, restaurantName,
  ifnull(firstImageUrl,-1) as firstImageUrl,
       case
           when restaurantFilter = 1 then '한식'
           when restaurantFilter = 2 then '일식'
           when restaurantFilter = 3 then '중식'
           when restaurantFilter = 4 then '양식'
           when restaurantFilter = 5 then '세계음식'
           when restaurantFilter = 6 then '뷔페'
           when restaurantFilter = 7 then '카페'
           when restaurantFilter = 8 then '주점'
       end
       as restaurantFilter,restaurantView,

       ifnull(reviewCount, 0) as reviewCount

    from Restaurant
    inner join User

         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId

        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId


    where Restaurant.restaurantId = ? and userId =?;

                `;
  const [getVisitedInfoRows] = await connection.query(getVisitedInfoQuery, getVisitedInfoParams);
  connection.release();

  return getVisitedInfoRows;
}

//하루에 한번만 가봤어요 가능, 체크하기
async function checkVisited(visitedInfoParams) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkVisitedQuery = `

  select * from RestaurantVisited
  where userId =? and restaurantId=? and timestampdiff(hour, updatedAt, now()) < 23;

                `;
  const [checkVisitedRows] = await connection.query(checkVisitedQuery, visitedInfoParams);
  connection.release();

  return [checkVisitedRows];
}

//가봤어요 등록
async function enrollVistied(visitedInfoParams2) {
  const connection = await pool.getConnection(async (conn) => conn);
  const enrollVistiedQuery = `

  insert into RestaurantVisited (restaurantId,userId,status) VALUES (?,?,?);

                `;
  const [enrollVistiedRows] = await connection.query(enrollVistiedQuery, visitedInfoParams2);
  connection.release();

  return enrollVistiedRows;
}

//식당 인덱스 체크
async function checkRestaurantIndex(restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const checkRestaurantIndexQuery = `

  select restaurantName from Restaurant where restaurantId = ?;

                `;
  const [checkRestaurantIndexRows] = await connection.query(checkRestaurantIndexQuery, restaurantId);
  connection.release();

  return checkRestaurantIndexRows;
}


//검색어로 식당 인덱스 찾기1
async function getIdFromRestaurantKeyWord(searchWord) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getIdFromRestaurantKeyWordQuery = `

  select restaurantId from RestaurantKeyWord where restaurantKeyWord like concat('%',?,'%');

                `;
  const [getIdFromRestaurantKeyWordRows] = await connection.query(getIdFromRestaurantKeyWordQuery,searchWord);
  connection.release();

  return getIdFromRestaurantKeyWordRows;
}

//검색어로 식당 인덱스 찾기2
async function getIdFromRestaurant(searchWord) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getIdFromRestaurantQuery = `

  select restaurantId from Restaurant where restaurantName like concat('%',?,'%');

                `;
  const [getIdFromRestaurantRows] = await connection.query(getIdFromRestaurantQuery,searchWord);
  connection.release();

  return getIdFromRestaurantRows;
}


//검색어로 식당 정보 가져오기
async function getRestaurantInfoByKeyWord(searchWordParams){
  const connection = await pool.getConnection(async (conn) => conn);
  const getRestaurantInfoByKeyWordQuery = `

  select
       Restaurant.restaurantId,
       restaurantName,

        round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

       SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) as areaName,

       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,
           ifnull(firstImageUrl,-1) as firstImageUrl

    from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                     from ReviewImg
                              inner join (select restaurantId, min(imgId) as firstImageId
                                          from ReviewImg
                                          group by restaurantId) firstImage
                                         on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                    on Restaurant.restaurantId = RestaurantImages.restaurantId


        left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
        on Restaurant.restaurantId = ReviewCount.restaurantId

        left outer join (select restaurantId, count(*) as isLike from RestaurantLike where userId = ? and status = 1
        group by restaurantId) IsLike
        on Restaurant.restaurantId = IsLike.restaurantId

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where Restaurant.status = 1 and Restaurant.inspection = 1 and SUBSTRING_INDEX(SUBSTRING_INDEX(restaurantLocation, " ", 2), " ", -1) in (?)
    and Restaurant.restaurantId in (?)
    order by star
limit ?,?;

                `;
  const [getRestaurantInfoByKeyWordRows] = await connection.query(getRestaurantInfoByKeyWordQuery,searchWordParams);
  connection.release();

  return getRestaurantInfoByKeyWordRows;
}

//검색어로 식당 인덱스 찾기2
async function getEatDealByKeyWord(searchWord) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getEatDealByKeyWordQuery = `

  select EatDeal.eatDealId,
        CASE
           WHEN TIMESTAMPDIFF(HOUR, EatDeal.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, EatDeal.updatedAt, now()) > 7, date_format(EatDeal.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, EatDeal.updatedAt, now()), " 일 전"))
           WHEN TIMESTAMPDIFF(HOUR, EatDeal.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, EatDeal.updatedAt, now()), " 분 전")
           ELSE concat(TIMESTAMPDIFF(HOUR, EatDeal.updatedAt, now()), " 시간 전")
         END AS updatedAt,firstImageUrl,eatDealOneLine

       from EatDeal
       inner join Restaurant on EatDeal.restaurantId = Restaurant.restaurantId
       left outer join (select EatDealImg.eatDealId, eatDealImgUrl as firstImageUrl
                     from EatDealImg
                              inner join (select eatDealId, min(imgId) as firstImageId
                                          from EatDealImg
                                          group by eatDealId) firstImage
                                         on EatDealImg.imgId = firstImage.firstImageId where EatDealImg.status = 1) EatDealImages
                    on EatDeal.eatDealId = EatDealImages.eatDealId

where eatDealName like concat('%',?,'%') and EatDeal.status = 1
limit 1;
                `;
  const [getEatDealByKeyWordRows] = await connection.query(getEatDealByKeyWordQuery,searchWord);
  connection.release();

  return getEatDealByKeyWordRows;
}

//유저 디바이스 토큰 가져오기
async function getUserDeviceToken(id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getUserDeviceTokenQuery = `

  select userName,deviceToken from User where userId = ?;

                `;
  const [getUserDeviceTokenRows] = await connection.query(getUserDeviceTokenQuery,id);
  connection.release();

  return getUserDeviceTokenRows;
}




module.exports = {
  allRestaurantInfo,
  topListInfo,
  insertRestaurant,
  allRestaurantInfoByMenuFilter,
  allRestaurantInfoByPriceFilter,
  allRestaurantInfoByMenuPriceFilter,
  setSort,
  setUserLocation,
  allRestaurantInfoLike,
  allRestaurantInfoVisited,
  allRestaurantInfoByMenuFilterLike,
  allRestaurantInfoByMenuFilterVisited,
  allRestaurantInfoByPriceFilterLike,
  allRestaurantInfoByPriceFilterVisited,
  allRestaurantInfoByMenuPriceFilterLike,
  allRestaurantInfoByMenuPriceFilterVisited,
  checkRestaurantLike,
  postRestaurantLike,
  changeRestaurantLikeOff,
  changeRestaurantLikeOn,
  plusRestaurantView,
  getRestaurantImg,
  getRestaurantDetailInfo,
  getRestaurantMenuImg,
  getRestaurantReviewCount,
  getRestaurantReview,
  getRestaurantReviewImg,
  getRestaurantKeyWord,
  setRestaurantLocation,
  getNearRestaurant,
  getCurrentArea,
  checkRestaurant,
  imagesDetailInfo,
  checkImagesDetail,
  getVisitedInfo,
  checkVisited,
  enrollVistied,
  checkRestaurantIndex,
  getIdFromRestaurantKeyWord,
  getIdFromRestaurant,
  getRestaurantInfoByKeyWord,
  getEatDealByKeyWord,
  getUserDeviceToken
};
