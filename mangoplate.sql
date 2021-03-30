-- Restaurant Table Create SQL
CREATE TABLE RestaurantMenuImg
(
    `imgId`                INT       NOT NULL AUTO_INCREMENT COMMENT '이미지 id',
    `restaurantMenuImgUrl` TEXT      NOT NULL COMMENT '식당메뉴판 이미지',
    `restaurantId`         INT       NOT NULL COMMENT '식당 ID',
    `createdAt`            TIMESTAMP NOT NULL DEFAULT current_timestamp,
    `updatedAt`            TIMESTAMP NOT NULL DEFAULT current_timestamp on update current_timestamp,
    `status`               TINYINT   NOT NULL DEFAULT 1 COMMENT '1: 활성, 0: 비활성',
    PRIMARY KEY (imgId)
);

ALTER TABLE RestaurantMenuImg
    COMMENT '식당메뉴판 이미지';

-- Restaurant Table Create SQL
CREATE TABLE Area
(
    `areaId`        INT             NOT NULL AUTO_INCREMENT COMMENT '지역 아이디',
    `areaName`      VARCHAR(45)     NOT NULL COMMENT '지역 이름',
    `areaLatitude`  DECIMAL(17, 14) NOT NULL COMMENT '지역 위도',
    `areaLongitude` DECIMAL(17, 14) NOT NULL COMMENT '지역 경도',
    `createdAt`     TIMESTAMP       NOT NULL DEFAULT current_timestamp,
    `updatedAt`     TIMESTAMP       NOT NULL DEFAULT current_timestamp on update current_timestamp,
    `status`        TINYINT         NOT NULL DEFAULT 1 COMMENT '1: 활성, 0: 비활성',
    PRIMARY KEY (areaId)
);
ALTER TABLE Area
    COMMENT '지역의 위도 경도 저장';

-- (별점 기준) 리뷰순 기준, 거리순 기준으로 필터가 존재함 + 음식종류, 가격, 주차 필터가 존재
-- order by star,reviewCount, distance

-- 식당 전체 조회 부분 탑리스트 부분
select topListId, topListImgUrl, topListName
from TopList;

-- 모든 식당 조회,
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS distance,
       areaName,
       restaurantView,
       reviewCount,
       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
           as star,

       firstImageUrl
from Restaurant
         inner join Area
         left outer join (select ReviewImg.reviewId, reviewImgUrl as firstImageUrl
                          from ReviewImg
                                   inner join (select reviewId, min(imgId) as firstImageId
                                               from ReviewImg
                                               group by reviewId) firstImage
                                              on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                         on Restaurant.restaurantId = RestaurantImages.reviewId

         left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
                         on Restaurant.restaurantId = ReviewCount.restaurantId

where areaName = '성북'
  and Restaurant.status = 1
having distance < 10
order by CASE
             WHEN @var = 1 THEN distance
             END asc,
         CASE
             WHEN @var = 2 THEN star
             WHEN @var = 3 THEN reviewCount
             END DESC;
;



-- 위치정보 동의
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromArea',

       round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromUser',

       areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike, 0)      as isLike,
       ifnull(visited, 0)     as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                              as star,
       firstImageUrl

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

         left outer join (select restaurantId, count(*) as isLike
                          from RestaurantLike
                          where userId = '1' -- 이부분 변경 해야함
                          group by restaurantId) IsLike
                         on Restaurant.restaurantId = IsLike.restaurantId

         left outer join (select restaurantId, count(*) as visited
                          from RestaurantVisited
                          where userId = '1' -- 이부분 변경 해야함
                          group by restaurantId) Visited
                         on Restaurant.restaurantId = Visited.restaurantId

where areaName = ?
  and Restaurant.status = 1
having distanceFromArea < 20 -- 특정지역은 20킬로 이하만 나오게 설정(성북이면 성북역 기준으로 20킬로 이하만 출력)
   and distanceFromUser < 10 -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
order by CASE
             WHEN @sort = 1 THEN distanceFromUser
             END asc,
         CASE
             WHEN @sort = 2 THEN star
             WHEN @sort = 3 THEN reviewCount
             else star
             END DESC
limit ?,?;


set @var := 1;

select restaurantName,
       ifnull(reviewCount, 0) reviewCount,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS                 'distance'

from Restaurant
         inner join Area
         left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
                         on Restaurant.restaurantId = ReviewCount.restaurantId
where areaName = '성북'
  and Restaurant.status = 1
order by CASE
             WHEN @var = 1 THEN distance
             END asc,
         CASE
             WHEN @var = 2 THEN reviewCount
             END DESC;


select restaurantName,
       ifnull(reviewCount, 0) reviewCount,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS                 'distance'

from Restaurant
         inner join Area
         left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
                         on Restaurant.restaurantId = ReviewCount.restaurantId
where areaName = '성북'
  and Restaurant.status = 1
limit 2,2;


-- 가봤어요
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromArea',

       round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromUser',

       areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike, 0)      as isLike,
       ifnull(visited, 0)     as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                              as star,
       firstImageUrl

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

         left outer join (select restaurantId, count(*) as isLike
                          from RestaurantLike
                          where userId = '1' -- 이부분 변경 해야함
                          group by restaurantId) IsLike
                         on Restaurant.restaurantId = IsLike.restaurantId

         inner join (select restaurantId, count(*) as visited
                     from RestaurantVisited
                     where userId = '1' -- 이부분 변경 해야함
                     group by restaurantId) Visited
                    on Restaurant.restaurantId = Visited.restaurantId

where areaName = ?
  and Restaurant.status = 1
having distanceFromArea < 20 -- 특정지역은 20킬로 이하만 나오게 설정(성북이면 성북역 기준으로 20킬로 이하만 출력)
   and distanceFromUser < 10 -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
order by CASE
             WHEN @sort = 1 THEN distanceFromUser
             END asc,
         CASE
             WHEN @sort = 2 THEN star
             WHEN @sort = 3 THEN reviewCount
             else star
             END DESC
limit ?,?;


-- 식당 전체 조회
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromArea',

       round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromUser',

       areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike, 0)      as isLike,
       ifnull(visited, 0)     as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                              as star,
       firstImageUrl

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

         left outer join (select restaurantId, count(*) as isLike
                          from RestaurantLike
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) IsLike
                         on Restaurant.restaurantId = IsLike.restaurantId

         left outer join (select restaurantId, count(*) as visited
                          from RestaurantVisited
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) Visited
                         on Restaurant.restaurantId = Visited.restaurantId

where areaName = ?
  and Restaurant.status = 1
  and restaurantPriceFilter in (?)
  and restaurantFilter in (?)
having distanceFromArea < 10 -- 특정지역은 10킬로 이하만 나오게 설정(성북를 선택했을 시 성북역 기준으로 10킬로 이하만 출력)
   and distanceFromUser < ?  -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
order by CASE
             WHEN @sort = 1 THEN distanceFromUser
             END asc,
         CASE
             WHEN @sort = 2 THEN star
             WHEN @sort = 3 THEN reviewCount
             else star
             END DESC
limit ?,?;
-- userLatitude=37.6511723&userLongitude=127.0481563&


-- 식당 상세조회 관련 쿼리

update RestaurantLike
set status=0
where restaurantId = ?
  and userId = ?;

-- 식당 자세히 보기 이미지
select reviewId, reviewImgUrl
from ReviewImg
where restaurantId = ?
limit 4;

-- 식당 상세조회 할 때 조회 수 플러스 1
update Restaurant
set restaurantView = Restaurant.restaurantView + 1
where restaurantId = ?;

-- 식당 상세조회가져오기
select Restaurant.restaurantId,
       restaurantName,
       -- 임시알고리즘
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                                         as star,
       restaurantView,
       ifnull(likeCount, 0)              as likeCount,
       ifnull(reviewCount, 0)            as reviewCount,
       ifnull(userLike, 0)               as userLike,
       ifnull(uservisited, 0)            as uservisited,
       ifnull(restaurantInfo, -1)        as restaurantInfo,

       restaurantLocation,
       restaurantLatitude,
       restaurantLongitude,
       ifnull(restaurantPhoneNumber, -1) as restaurantPhoneNumber,
       ifnull(restaurantTime, -1)        as restaurantTime,
       ifnull(restaurantHoliday, -1)     as restaurantHoliday,
       ifnull(restaurantRestTime, -1)    as restaurantRestTime,
       ifnull(restaurantPrice, -1)       as restaurantPrice,
       ifnull(restaurantMenu, -1)        as restaurantMenu

from Restaurant
         -- 식당 좋아요 수 전체 수
         left outer join (select restaurantId, count(*) as likeCount
                          from RestaurantLike
                          where status = 1 and restaurantId = ?
                          group by restaurantId) RestaurantLike -- 식당 아이디 변경
                         on Restaurant.restaurantId = RestaurantLike.restaurantId
    -- 식당 리뷰 수
         left outer join (select restaurantId, count(*) as reviewCount
                          from Review
                          where status = 1 and restaurantId = ?
                          group by restaurantId) RestaurantReview -- 식당 아이디 변경
                         on Restaurant.restaurantId = RestaurantReview.restaurantId
    -- 유저가 식당을 좋아요 했는지
         left outer join (select restaurantId, count(*) as userLike
                          from RestaurantLike
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) UserLike
                         on Restaurant.restaurantId = UserLike.restaurantId
    -- 유저가 식당을 몇번 방문 했었는지
         left outer join (select restaurantId, count(*) as uservisited
                          from RestaurantVisited
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) Visited
                         on Restaurant.restaurantId = Visited.restaurantId

where Restaurant.restaurantId = ?;

-- 식당메뉴 이미지 가져오기
select restaurantMenuImgUrl
from RestaurantMenuImg
where restaurantId = ?;

-- 식당 키워드 가져오기
select restaurantKeyWord
from RestaurantKeyWord
where restaurantId = ?
  and status = 1;

-- 리뷰 부분
select Review.reviewId,

       userProfileImgUrl,
       userName,

       -- 홀릭은 그 유저가 리뷰 100개 쓰면 홀릭
       case
           when userReviewCount >= 100 then 1
           when userReviewCount < 100 then 0
           end                     as isHolic,
       case
           when reviewExpression = -1 then '별로'
           when reviewExpression = 1 then '괜찮다'
           when reviewExpression = 2 then '맛있다'
           end                     as reviewExpression,
       userReviewCount,
       ifnull(userFollower, 0)     as userFollower,
       reviewContents,
       ifnull(reviewLikeCount, 0)  as reviewLikeCount,
       ifnull(reviewReplyCount, 0) as reviewReplyCount,
       ifnull(userReviewLike, 0)   as userReviewLike,
       Review.createdAt

from Review

         -- 리뷰를 작성한 사용자가 작성한 리뷰 개수가 몇개 인지
         inner join User on Review.userId = User.userId
         left outer join (select userId, count(*) as userReviewCount
                          from Review
                          where status = 1
                          group by userId) ReviewCount
                         on ReviewCount.userId = User.userId
    -- 리뷰를 작성한 사람의 팔로워 수가 몇명인지
         left outer join (select targetUserId, count(*) as userFollower
                          from Follow
                          where status = 1
                          group by targetUserId) Follower
                         on ReviewCount.userId = User.userId and User.userId = Follower.targetUserId
    -- 리뷰의 좋아요 수가 몇개인지
         left outer join (select reviewId, count(*) as reviewLikeCount
                          from ReviewLike
                          where status = 1
                          group by reviewId) ReviewLike
                         on ReviewLike.reviewId = Review.reviewId

    -- 유저가 리뷰을 좋아요 했는지
         left outer join (select reviewId, count(*) as userReviewLike
                          from ReviewLike
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by reviewId) UserReviewLike
                         on UserReviewLike.reviewId = Review.reviewId

    -- 리뷰 답글 개수 관련 쿼리
         left outer join (select reviewId, count(*) as reviewReplyCount
                          from ReviewReply
                          where status = 1 -- 이부분 변경 해야함
                          group by reviewId) Reply
                         on Reply.reviewId = Review.reviewId

where restaurantId = ?
order by createdAt desc
limit 4;


-- 리뷰 개수 부분 쿼리
select count(Review.reviewId)                                   as reviewCount,
       count(case when Review.reviewExpression = 2 then 1 end)  as deliciousCount,
       count(case when Review.reviewExpression = 1 then 1 end)  as okayCount,
       count(case when Review.reviewExpression = -1 then 1 end) as badCount
from Review
where restaurantId = ?;


-- Restaurant Table Create SQL
CREATE TABLE RestaurantKeyWord
(
    `keyWordId`         INT         NOT NULL AUTO_INCREMENT COMMENT '키워드인덱스',
    `restaurantId`      INT         NOT NULL COMMENT '식당인덱스',
    `restaurantKeyWord` VARCHAR(30) NOT NULL,
    `createdAt`         TIMESTAMP   NOT NULL DEFAULT current_timestamp,
    `updatedAt`         TIMESTAMP   NOT NULL DEFAULT current_timestamp on update current_timestamp,
    `status`            TINYINT     NOT NULL DEFAULT 1 COMMENT '1: 활성 0:비활성',
    PRIMARY KEY (keyWordId)
);

ALTER TABLE RestaurantKeyWord
    COMMENT '식당키워드';

-- 식당 위도 경도 쿼리 가져오기
select @currentRestaurantLatitude := restaurantLatitude,
       @currentRestaurantLongitude := restaurantLongitude

from Restaurant
where restaurantId = ?;


-- 주변 식당 가져오기 쿼리
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(@currentRestaurantLatitude)) * cos(radians(restaurantLatitude)) *
                  cos(radians(restaurantLongitude)
                      - radians(@currentRestaurantLongitude)) +
                  sin(radians(@currentRestaurantLatitude)) * sin(radians(restaurantLatitude))), 2)
                              AS 'distanceFromRestaurant',

       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike, 0)      as isLike,
       ifnull(visited, 0)     as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                              as star,
       firstImageUrl

from Restaurant
         left outer join (select ReviewImg.restaurantId, reviewImgUrl as firstImageUrl
                          from ReviewImg
                                   inner join (select restaurantId, min(imgId) as firstImageId
                                               from ReviewImg
                                               group by restaurantId) firstImage
                                              on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                         on Restaurant.restaurantId = RestaurantImages.restaurantId

         left outer join (select restaurantId, count(*) as reviewCount
                          from Review
                          where status = 1
                          group by restaurantId) ReviewCount
                         on Restaurant.restaurantId = ReviewCount.restaurantId

         left outer join (select restaurantId, count(*) as isLike
                          from RestaurantLike
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) IsLike
                         on Restaurant.restaurantId = IsLike.restaurantId

         left outer join (select restaurantId, count(*) as visited
                          from RestaurantVisited
                          where userId = ?
                            and status = 1-- 이부분 변경 해야함
                          group by restaurantId) Visited
                         on Restaurant.restaurantId = Visited.restaurantId

where Restaurant.status = 1
having distanceFromRestaurant > 0

order by distanceFromRestaurant
limit 4
;

select areaName,
       round(6371 *
             acos(cos(radians(@currentRestaurantLatitude)) * cos(radians(areaLatitude)) * cos(radians(areaLongitude)
                 - radians(@currentRestaurantLongitude)) +
                  sin(radians(@currentRestaurantLatitude)) * sin(radians(areaLatitude))), 2)
           AS 'distanceFromArea'
from Area
order by distanceFromArea
limit 1;

select restaurantName
from Restaurant
where restaurantId = ?;


select ReviewImg.reviewId, reviewImgUrl
from ReviewImg
         inner join Review on Review.reviewId = ReviewImg.reviewId
where restaurantId = ?
  and ReviewImg.status = 1
;

select reviewImgUrl
from ReviewImg
         inner join Review on Review.reviewId = ReviewImg.reviewId
where restaurantId = ?
limit 4;
-- restaurantId 없앴을 때 쿼리, 삭제해야 함.
select Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
                                 AS 'distanceFromArea',

       round(6371 *
             acos(cos(radians(@userLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(@userLongitude)) + sin(radians(@userLatitude)) * sin(radians(restaurantLatitude))), 2)
                                 AS 'distanceFromUser',

       areaName,
       restaurantView,
       ifnull(reviewCount, 0)    as reviewCount,
       ifnull(isLike, 0)         as isLike,
       ifnull(visited, 0)        as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView < 10 then 4.1
           when restaurantView >= 10 and restaurantView < 20 then 4.4
           when restaurantView >= 20 and restaurantView < 30 then 4.6
           else 4.7
           end
                                 as star,
       ifnull(firstImageUrl, -1) as firstImageUrl

from Restaurant
         inner join Area

         left outer join (select Review.reviewId, Review.restaurantId, firstImageUrl
                          from Review
                                   inner join (select ReviewImg.reviewId, reviewImgUrl as firstImageUrl
                                               from ReviewImg
                                                        inner join (select reviewId, min(imgId) as firstImageId
                                                                    from ReviewImg
                                                                    group by reviewId) firstImage
                                                                   on ReviewImg.imgId = firstImage.firstImageId) RestaurantImages
                                              on Review.reviewId = RestaurantImages.reviewId) RestaurantImagesTable
                         on Restaurant.restaurantId = RestaurantImagesTable.restaurantId

         left outer join (select restaurantId, count(*) as reviewCount from Review group by restaurantId) ReviewCount
                         on Restaurant.restaurantId = ReviewCount.restaurantId

         left outer join (select restaurantId, count(*) as isLike
                          from RestaurantLike
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) IsLike
                         on Restaurant.restaurantId = IsLike.restaurantId

         left outer join (select restaurantId, count(*) as visited
                          from RestaurantVisited
                          where userId = ?
                            and status = 1 -- 이부분 변경 해야함
                          group by restaurantId) Visited
                         on Restaurant.restaurantId = Visited.restaurantId

where areaName = ?
  and restaurantFilter in (?)
  and Restaurant.status = 1
  and Restaurant.inspection = 1
having distanceFromArea < 10 -- 특정지역은 10킬로 이하만 나오게 설정(성북를 선택했을 시 성북역 기준으로 10킬로 이하만 출력)
   and distanceFromUser < ?  -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
order by CASE
             WHEN @sort = 1 THEN distanceFromUser
             END asc,
         CASE
             WHEN @sort = 2 THEN star
             WHEN @sort = 3 THEN reviewCount
             else star
             END DESC
limit ?,?;


-- 리뷰사진 상세 보기 쿼리
select restaurantName,
       Review.reviewId,
       userProfileImgUrl,
       userName,

       -- 홀릭은 그 유저가 리뷰 100개 쓰면 홀릭
       case
           when userReviewCount >= 100 then 1
           when userReviewCount < 100 then 0
           end                   as isHolic,
       userReviewCount,
       ifnull(userFollower, 0)   as userFollower,
       reviewImgUrl,
       reviewContents,
       ifnull(userReviewLike, 0) as userReviewLike,
       CASE
           WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, Review.updatedAt, now()) > 7, date_format(Review.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, Review.updatedAt, now()), " 일 전"))
           WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, Review.updatedAt, now()), " 분 전")
           ELSE concat(TIMESTAMPDIFF(HOUR, Review.updatedAt, now()), " 시간 전")
           END                   AS updatedAt
from Review

         -- 리뷰를 작성한 사용자가 작성한 리뷰 개수가 몇개 인지
         inner join User on Review.userId = User.userId
         inner join ReviewImg on Review.reviewId = ReviewImg.reviewId
         inner join Restaurant on Review.restaurantId = Restaurant.restaurantId

         left outer join (select userId, count(*) as userReviewCount
                          from Review
                          where status = 1
                          group by userId) ReviewCount
                         on ReviewCount.userId = User.userId

    -- 리뷰를 작성한 사람의 팔로워 수가 몇명인지
         left outer join (select targetUserId, count(*) as userFollower
                          from Follow
                          where status = 1
                          group by targetUserId) Follower
                         on ReviewCount.userId = User.userId and User.userId = Follower.targetUserId

    -- 리뷰의 좋아요 수가 몇개인지
         left outer join (select reviewId, count(*) as reviewLikeCount
                          from ReviewLike
                          where status = 1
                          group by reviewId) ReviewLike
                         on ReviewLike.reviewId = Review.reviewId

    -- 유저가 리뷰을 좋아요 했는지
         left outer join (select reviewId, count(*) as userReviewLike
                          from ReviewLike
                          where userId = ?
                            and status = 1
                          group by reviewId) UserReviewLike
                         on UserReviewLike.reviewId = Review.reviewId

where imgId = ?;

select reviewId
from ReviewImg
where imgId = ?;
-- 레이크님 쿼리
UPDATE RestaurantVisited
SET status= if(blockStatus = 'Y', 'N', 'Y')
WHERE userId = ?
  and targetUserId = ?;


-- 가봤어요는 하루에 한번만 가능 하게 하는 쿼리
select * from RestaurantVisited
where userId =? and restaurantId=? and timestampdiff(hour, updatedAt, now()) < 23;

-- +1하는 쿼리
update RestaurantVisited
set status = status + 1
where userId = ? and restaurantId= ? and status;

-- 없다면 생성
insert into RestaurantVisited (restaurantId,userId,status) VALUES (?,?,?);



-- 1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점
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

-- 지역변수 설정
select @currentRestaurantLatitude := restaurantLatitude,
         @currentRestaurantLongitude := restaurantLongitude

       from Restaurant where restaurantId = ? ;


-- 지역 알려주는 쿼리
select areaName,
       round(6371 *
             acos(cos(radians(@currentRestaurantLatitude)) * cos(radians(areaLatitude)) * cos(radians(areaLongitude)
                 - radians(@currentRestaurantLongitude)) +
                  sin(radians(@currentRestaurantLatitude)) * sin(radians(areaLatitude))), 2)
           AS 'distanceFromArea'
from Area
order by distanceFromArea
limit 1;

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
        left outer join (select restaurantId, count(*) as uservisited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

where Restaurant.restaurantId = ?;

-- test
select
       Restaurant.restaurantId,
       restaurantName,
       round(6371 *
             acos(cos(radians(areaLatitude)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(areaLongitude)) + sin(radians(areaLatitude)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromArea',

        round(6371 *
             acos(cos(radians(0)) * cos(radians(restaurantLatitude)) * cos(radians(restaurantLongitude)
                 - radians(0)) + sin(radians(0)) * sin(radians(restaurantLatitude))), 2)
           AS 'distanceFromUser',

       areaName,
       restaurantView,
       ifnull(reviewCount, 0) as reviewCount,
       ifnull(isLike,0) as isLike,
       ifnull(visited,0) as visited,

       -- 일단 임시적으로 짜고 별점 알고리즘 다시짜야함.
       case
           when restaurantView <  10 then 4.1
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

        left outer join (select restaurantId, count(*) as visited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by restaurantId) Visited
        on Restaurant.restaurantId = Visited.restaurantId

    where areaName = ? and Restaurant.status = 1 and Restaurant.inspection = 1 and restaurantName REGEXP '태'
    having distanceFromArea < 10 -- 특정지역은 10킬로 이하만 나오게 설정(성북를 선택했을 시 성북역 기준으로 10킬로 이하만 출력)
    and distanceFromUser < ? -- 사용자 기준 지역은 쿼리스트링으로 받는 값 이하만 나오게 출력 (단위수는 킬로)
    order by CASE
              WHEN @sort = 1 THEN distanceFromUser
              END asc,
         CASE
              WHEN @sort = 2 THEN star
              WHEN @sort = 3 THEN reviewCount
              else star
              END DESC

limit ?,?;

set @location := 1;

-- 잇딜 전체 조회
select EatDeal.eatDealId,firstImageUrl,eatDealDiscount,eatDealBeforePrice,eatDealAfterPrice,
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

--  where SUBSTRING_INDEX(SUBSTRING_INDEX(Restaurant.restaurantLocation, " ", 2), " ", -1) in (?) and EatDeal.status = 1
limit ?,?;



select imgId,eatDealImgUrl from EatDealImg where eatDealId = ?;

select concat(eatDealOneLine,' ',eatDealDiscount,'% 할인' ) as message,
       eatDealName,restaurantId,eatDealOneLine,eatDealTerm,
       eatDealBeforePrice,eatDealAfterPrice,eatDealDiscount,eatDealPickUpPossible,
       restaurantInfo,menuInfo,noticeInfo,howToUseInfo,refundPolicyInfo

from EatDeal where eatDealId = ?;

select eatDealName from EatDeal where status = 1 and eatDealId = ?


-- 잇딜 전체 조회
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
having distanceFromUser < 5

limit ?,?;

-- 0214 작업 부분

select * from TopListBookMark where topListId =? and userId =?;

insert into TopListBookMark (topListId,userId,status) values (?, ?,1);

UPDATE TopListBookMark
SET status= if(status = 1, 0, 1)
WHERE topListId=? and userId = ? ;



-- top리스트 전부 제공.
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
limit ?,?;

-- 탑리스트 정보 부분
select
       topListName
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
        where TopList.topListId=?;

-- 탑리스트 식당 부분 후./. 빡세다 쿼리

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
                                          from Review -- where reviewExpression=2 리뷰평이 좋은것만 첫화면에 표시..?
                                          group by restaurantId) FirstReview
                                         on Review.reviewId = FirstReview.firstReviewId) RestaurantReviews
                    on Restaurant.restaurantId = RestaurantReviews.restaurantId


        -- 유저가 식당을 좋아요 했는지
        left outer join (select restaurantId, count(*) as userLike from RestaurantLike where userId = ? and status = 1
        group by restaurantId) UserLike
        on Restaurant.restaurantId = UserLike.restaurantId

       inner join User on RestaurantReviews.userId = User.userId
       where TopListContents.topListId =?
limit ?,?;



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
                                          from Review -- where reviewExpression=2 리뷰평이 좋은것만 첫화면에 표시..?
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


-- 팔로잉 관련 작업 내역 -- 아직 사용안함 나중에 사용 할 수 도 있음.
select userProfileImgUrl,
       ifnull(userFollower,0)as userFollower,
       ifnull(userFollowing,0)as userFollowing,userName,

       -- 홀릭은 그 유저가 리뷰 10개 쓰면 홀릭
       case
           when userReviewCount >= 10 then 1
           when userReviewCount < 10 then 0
           end                   as isHolic,

       ifnull(userReviewCount,0)as userReviewCount,
       ifnull(userVisited,0)as userVisited,reviewImage,userLike,isFollow

from User

    -- 사진 개수 부분 ..
         left outer join (select imgId,ReviewImg.reviewId,count(*) as reviewImage
                     from ReviewImg
                              inner join (select userId,reviewId
                                          from Review where status=1 and userId = ?
                                          group by reviewId) firstImage on firstImage.reviewId = ReviewImg.reviewId
                                         ) RestaurantImages
                    on userId = User.userId

         -- 유저가 작성한 리뷰 숫자
         left outer join (select userId,reviewId, count(*) as userReviewCount
                          from Review
                          where status = 1
                          group by userId) ReviewCount
                          on ReviewCount.userId = User.userId
         -- 유저의 팔로워 숫자
         left outer join (select targetUserId, count(*) as userFollower
                          from Follow
                          where status = 1
                          group by targetUserId) Follower
                         on User.userId = Follower.targetUserId
         -- 유저의 팔로잉 숫자
         left outer join (select userId, count(*) as userFollowing
                          from Follow
                          where status = 1
                          group by userId) Following
                         on User.userId = Following.userId

        -- 사용자가 이유저를 팔로우 했는지
         left outer join (select targetUserId, count(*) as isFollow
                          from Follow
                          where status = 1 and Follow.userId = ? -- 이곳에는 사용자 아이디 입력 타켓 아이디 아님!
                          group by targetUserId) IsFollower
                         on User.userId = IsFollower.targetUserId

        -- 유저가 식당을 몇번 방문 했었는지
        left outer join (select userId, count(*) as userVisited from RestaurantVisited where userId = ? and status = 1 or status = 2
        group by userId) Visited
        on Visited.userId = User.userId

        -- 유저가 식당을 좋아요 몇개 했는지
        left outer join (select userId, count(*) as userLike from RestaurantLike where userId = ? and status = 1
        group by userId) UserLike on User.userId = UserLike.userId

where User.userId=?;




select * from Follow where userId=? and targetUserId=?
insert into Follow (userId,targetUserId,status) values (?,?,1);


 update Follow set status= if(status = 1, 0, 1)
        where userId=? and targetUserId = ? ;


set @sort :=3;
set    @userLatitude :=?,  -- 37.6511723 127.0481563
       @userLongitude :=?;


-- 식당 전체 조회 쿼리 수정 중.

select restaurantId from RestaurantKeyWord where restaurantKeyWord like concat('%',?,'%');


select restaurantId from Restaurant where restaurantName like concat('%',?,'%');


select restaurantId from Restaurant where Restaurant.restaurantMenu like concat('%',?,'%');

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


select * from RestaurantKeyWord where restaurantKeyWord like '%망고%';


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

update User set deviceToken =? where userId = ?;

select userName,deviceToken from User where userId = ?;

select deviceToken from User where userId = ?;

select User.userId,deviceToken,userName from Review
                   inner join User on User.userId = Review.userId
                   where reviewId=?

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
 having distanceFromUser < 30 -- 유저 기준 3키로 이하
 limit ?,?;