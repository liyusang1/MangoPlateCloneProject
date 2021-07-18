const {pool} = require("../../../config/database");

// 리뷰 전체 조회
async function getAllReviews(expressionfilter, location, page, limit) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getAllReviewsQuery = `
    SELECT Review.reviewId,
           UserCount.userId,
           UserCount.userName,
           case
             when userReviewCount >= 10 then 1
             when userReviewCount < 10 then 0
             end                                                                   as isHolic,
           UserCount.userProfileImgUrl,
           ifnull(userReviewCount, 0)                                              as userReviewCount,
           ifnull(userFollowerCount, 0)                                            as userFollowerCount,
           reviewExpression,
           reviewContents,
           R.restaurantId,
           R.restaurantName,
           SUBSTRING_INDEX(SUBSTRING_INDEX(R.restaurantLocation, " ", 2), " ", -1) as restaurantLocation,
           ifnull(reviewLikeCount, 0)                                              as reviewLikeCount,
           ifnull(reviewReplyCount, 0)                                             as reviewReplyCount,
           CASE
             WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, Review.updatedAt, now()) > 7, date_format(Review.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, Review.updatedAt, now()), " 일 전"))
             WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, Review.updatedAt, now()), " 분 전")
             ELSE concat(TIMESTAMPDIFF(HOUR, Review.updatedAt, now()), " 시간 전")
             END                                                                   AS updatedAt
    from Review
           inner join Restaurant R on Review.restaurantId = R.restaurantId
           inner join (select U.userId, userName, userProfileImgUrl, userReviewCount, userFollowerCount
                       from User U
                              left outer join (select userId, count(*) as userReviewCount
                                               from Review
                                               group by userId) ReviewCount on U.userId = ReviewCount.userId
                              left outer join (select targetUserId, count(*) as userFollowerCount
                                               from Follow
                                               group by targetUserId) FollowCount
                                              on U.userId = FollowCount.targetUserId) UserCount
                      on UserCount.userId = Review.userId
           left outer join (select reviewId, count(*) as reviewLikeCount
                            from ReviewLike
                            group by reviewId) ReviewLike on Review.reviewId = ReviewLike.reviewId
           left outer join (select reviewId, count(*) as reviewReplyCount
                            from ReviewReply
                            group by reviewId) ReplyCount on Review.reviewId = ReplyCount.reviewId
    where Review.reviewExpression in (?)
      and Review.status = 1
      and SUBSTRING_INDEX(SUBSTRING_INDEX(R.restaurantLocation, " ", 2), " ", -1) in (?)
    order by Review.updatedAt DESC limit ?, ?;
  `;
  const getAllReviewsParams = [expressionfilter, location, page, limit];
  const [getAllReviewsRows] = await connection.query(getAllReviewsQuery, getAllReviewsParams);
  connection.release();

  return getAllReviewsRows;
}

// 리뷰 상세 조회
async function getReview(reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const getReviewQuery = `
    SELECT Review.reviewId,
           UserCount.userId,
           UserCount.userName,
           case
             when userReviewCount >= 10 then 1
             when userReviewCount < 10 then 0
             end                                                                   as isHolic,
           UserCount.userProfileImgUrl,
           ifnull(userReviewCount, 0)                                              as userReviewCount,
           ifnull(userFollowerCount, 0)                                            as userFollowerCount,
           reviewExpression,
           reviewContents,
           R.restaurantId,
           R.restaurantName,
           SUBSTRING_INDEX(SUBSTRING_INDEX(R.restaurantLocation, " ", 2), " ", -1) as restaurantLocation,
           ifnull(reviewLikeCount, 0)                                              as reviewLikeCount,
           ifnull(reviewReplyCount, 0)                                             as reviewReplyCount,
           CASE
             WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, Review.updatedAt, now()) > 7, date_format(Review.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, Review.updatedAt, now()), " 일 전"))
             WHEN TIMESTAMPDIFF(HOUR, Review.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, Review.updatedAt, now()), " 분 전")
             ELSE concat(TIMESTAMPDIFF(HOUR, Review.updatedAt, now()), " 시간 전")
             END                                                                   AS updatedAt
    from Review
           inner join Restaurant R on Review.restaurantId = R.restaurantId
           inner join (select U.userId, userName, userProfileImgUrl, userReviewCount, userFollowerCount
                       from User U
                              left outer join (select userId, count(*) as userReviewCount
                                               from Review
                                               group by userId) ReviewCount on U.userId = ReviewCount.userId
                              left outer join (select targetUserId, count(*) as userFollowerCount
                                               from Follow
                                               group by targetUserId) FollowCount
                                              on U.userId = FollowCount.targetUserId) UserCount
                      on UserCount.userId = Review.userId
           left outer join (select reviewId, count(*) as reviewLikeCount
                            from ReviewLike
                            group by reviewId) ReviewLike on Review.reviewId = ReviewLike.reviewId
           left outer join (select reviewId, count(*) as reviewReplyCount
                            from ReviewReply
                            group by reviewId) ReplyCount on Review.reviewId = ReplyCount.reviewId
    where Review.reviewId = ?
      and Review.status = 1
    order by Review.updatedAt DESC
  `;
  const getReviewParams = [reviewId];
  const [getReviewRows] = await connection.query(getReviewQuery, getReviewParams);
  connection.release();

  return getReviewRows;
}

// 식당 가고싶다 여부
async function restaurantLikeStatus(userId, restaurantId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const restaurantLikeQuery = `
    SELECT *
    from RestaurantLike
    where userId = ?
      and restaurantId = ?
      and status = 1;
  `;
  const restaurantLikeParams = [userId, restaurantId];
  const [restaurantLikeRows] = await connection.query(restaurantLikeQuery, restaurantLikeParams);
  connection.release();

  return restaurantLikeRows;
}

// 리뷰 좋아요 여부
async function reviewLikeStatus(userId, reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const reviewlikeStatusQuery = `
    SELECT *
    from ReviewLike
    where userId = ?
      and reviewId = ?
      and status = 1;
  `;
  const reviewlikeStatusParams = [userId, reviewId];
  const [reviewlikeStatusRows] = await connection.query(reviewlikeStatusQuery, reviewlikeStatusParams);
  connection.release();

  return reviewlikeStatusRows;
}

// 리뷰 댓글 조회
async function selectReviewReply(reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectReviewReplyQuery = `
    SELECT replyId,
           UserCount.userId            as replyUserId,
           UserCount.userName          as replyUserName,
           case
             when ifnull(userReviewCount, 0) >= 10 then 1
             when ifnull(userReviewCount, 0) < 10 then 0
             end                       as isHolic,
           UserCount.userProfileImgUrl as replyUserProfileImgUrl,
           replyContents,
           CASE
             WHEN TIMESTAMPDIFF(HOUR, ReviewReply.updatedAt, now()) > 23
               THEN IF(TIMESTAMPDIFF(DAY, ReviewReply.updatedAt, now()) > 7,
                       date_format(ReviewReply.updatedAt, '%Y-%m-%d'),
                       concat(TIMESTAMPDIFF(DAY, ReviewReply.updatedAt, now()), " 일 전"))
             WHEN TIMESTAMPDIFF(HOUR, ReviewReply.updatedAt, now()) < 1
               THEN concat(TIMESTAMPDIFF(MINUTE, ReviewReply.updatedAt, now()), " 분 전")
             ELSE concat(TIMESTAMPDIFF(HOUR, ReviewReply.updatedAt, now()), " 시간 전")
             END                       AS updatedAt
    FROM ReviewReply
           inner join (select U.userId, userName, userProfileImgUrl, userReviewCount
                       from User U
                              left outer join (select userId, count(*) as userReviewCount
                                               from Review
                                               group by userId) ReviewCount on U.userId = ReviewCount.userId) UserCount
                      on UserCount.userId = ReviewReply.userId
    WHERE reviewId = ?
      and ReviewReply.status = 1;
  `;
  const selectReviewReplyParams = [reviewId];
  const [selectReviewReplyRows] = await connection.query(selectReviewReplyQuery, selectReviewReplyParams);
  connection.release();

  return selectReviewReplyRows;
}

// 리뷰 댓글 답글
async function selectRevieReplyComment(replyId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectRevieReplyCommentQuery = `
    SELECT commentId, userName
    FROM User
           inner join ReviewComment on User.userId = ReviewComment.targetUserId
    WHERE replyId = ?
      and ReviewComment.status = 1
  `;
  const selectRevieReplyCommentParams = [replyId];
  const [selectRevieReplyCommentRows] = await connection.query(
      selectRevieReplyCommentQuery,
      selectRevieReplyCommentParams
  );
  connection.release();

  return selectRevieReplyCommentRows;
}

// 리뷰 이미지
async function selectReviewImgs(reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectReviewImgsQuery = `
    SELECT imgId, reviewImgUrl
    FROM ReviewImg
    WHERE reviewId = ?
      and status = 1
  `;
  const selectReviewImgsParams = [reviewId];
  const [selectReviewImgsRows] = await connection.query(selectReviewImgsQuery, selectReviewImgsParams);
  connection.release();

  return selectReviewImgsRows;
}

// 라뷰 추가
async function insertReview(connection, insertReviewParams) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewQuery = `
    INSERT INTO Review (userId, restaurantId, reviewExpression, reviewContents)
    VALUES (?, ?, ?, ?)
  `;
  const [insertReviewRows] = await connection.query(insertReviewQuery, insertReviewParams);
  // connection.release();

  return insertReviewRows;
}

// 리뷰 수정
async function updateReview(connection, updateReviewParams) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const updateReviewQuery = `
    UPDATE Review
    SET userId           = ?,
        restaurantId     = ?,
        reviewExpression = ?,
        reviewContents   = ?
    WHERE reviewId = ?
  `;
  const [updateReviewRows] = await connection.query(updateReviewQuery, updateReviewParams);
  // connection.release();

  return updateReviewRows;
}

// 라뷰 이미지 추가
async function insertReviewImg(connection, insertReviewImgParams) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewImgQuery = `
    INSERT INTO ReviewImg (restaurantId, reviewId, reviewImgUrl)
    VALUES (?, ?, ?)
  `;
  const [insertReviewImgRows] = await connection.query(insertReviewImgQuery, insertReviewImgParams);
  // connection.release();

  return insertReviewImgRows;
}

// 라뷰 이미지 수정
async function updateReviewImg(connection, updateReviewImgParams) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const updateReviewImgQuery = `
    UPDATE ReviewImg
    SET reviewImgUrl = ?
    WHERE imgId = ?
  `;
  const [updateReviewImgRows] = await connection.query(updateReviewImgQuery, updateReviewImgParams);
  // connection.release();

  return updateReviewImgRows;
}

// 라뷰 이미지 삭제
async function deleteReviewImg(connection, imgId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const deleteReviewImgQuery = `
    UPDATE ReviewImg
    SET status = 0
    WHERE imgId = ?
  `;
  const deleteReviewImgParams = [imgId];
  const [deleteReviewImgRows] = await connection.query(deleteReviewImgQuery, deleteReviewImgParams);
  // connection.release();

  return deleteReviewImgRows;
}

// 라뷰 삭제
async function deleteReview(reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deleteReviewQuery = `
    UPDATE Review
    SET status = 0
    WHERE reviewId = ?
  `;
  const deleteReviewParams = [reviewId];
  const [deleteReviewRows] = await connection.query(deleteReviewQuery, deleteReviewParams);
  connection.release();

  return deleteReviewRows;
}

// 리뷰 좋아요 확인
async function selectReviewLike(userId, reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const selectReviewLikeQuery = `
    SELECT status
    from ReviewLike
    where userId = ?
      and reviewId = ?;
  `;
  const selectReviewLikeParams = [userId, reviewId];
  const [reviewLikeRows] = await connection.query(selectReviewLikeQuery, selectReviewLikeParams);
  connection.release();

  return reviewLikeRows;
}

// 리뷰 좋아요 추가
async function insertReviewlike(userId, reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewlikeQuery = `
    INSERT INTO ReviewLike (reviewId, userId)
    VALUES (?, ?)
  `;
  const insertReviewlikeParams = [reviewId, userId];
  const [insertReviewlikeRows] = await connection.query(insertReviewlikeQuery, insertReviewlikeParams);
  connection.release();

  return insertReviewlikeRows;
}

// 리뷰 좋아요 업데이트
async function updateReviewlike(userId, reviewId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const updateReviewlikeQuery = `
    UPDATE ReviewLike
    SET status = if(status = 1, 0, 1)
    WHERE userId = ?
      and reviewId = ?
  `;
  const updateReviewlikeParams = [userId, reviewId];
  const [updateReviewlikeRows] = await connection.query(updateReviewlikeQuery, updateReviewlikeParams);
  connection.release();

  return updateReviewlikeRows;
}

// 리뷰 댓글 작성
async function insertReviewReply(connection, reviewId, userId, replyContents) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewReplyQuery = `
    INSERT INTO ReviewReply (reviewId, userId, replyContents)
    VALUES (?, ?, ?)
  `;
  const insertReviewReplyParams = [reviewId, userId, replyContents];
  const [insertReviewReplyRows] = await connection.query(insertReviewReplyQuery, insertReviewReplyParams);
  // connection.release();

  return insertReviewReplyRows;
}

// 리뷰 댓글 답글 작성
async function insertReviewReplyComment(connection, replyId, targetUserId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewReplyCommentQuery = `
    INSERT INTO ReviewComment(replyId, targetUserId)
    VALUES (?, ?)
  `;
  const insertReviewReplyCommentParams = [replyId, targetUserId];
  const [insertReviewReplyCommentRows] = await connection.query(
      insertReviewReplyCommentQuery,
      insertReviewReplyCommentParams
  );
  // connection.release();

  return insertReviewReplyCommentRows;
}

// 리뷰 댓글 수정
async function updateReviewReply(connection, replyId, replyContents) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const updateReviewReplyQuery = `
    UPDATE ReviewReply
    SET replyContents = ?
    WHERE replyId = ?
  `;
  const updateReviewReplyParams = [replyContents, replyId];
  const [updateReviewReplyRows] = await connection.query(updateReviewReplyQuery, updateReviewReplyParams);
  // connection.release();

  return updateReviewReplyRows;
}

// 리뷰 댓글 답글 수정
async function updateReviewReplyComment(connection, commentId, targetUserId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const updateReviewReplyCommentQuery = `
    UPDATE ReviewComment
    SET targetUserId = ?
    WHERE commentId = ?
  `;
  const updateReviewReplyCommentParams = [targetUserId, commentId];
  const [updateReviewReplyCommentRows] = await connection.query(
      updateReviewReplyCommentQuery,
      updateReviewReplyCommentParams
  );
  // connection.release();

  return updateReviewReplyCommentRows;
}

// 리뷰 댓글 답글 추가
async function insertReviewReplyComment(connection, replyId, targetUserId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const insertReviewReplyCommentQuery = `
    INSERT INTO ReviewComment(replyId, targetUserId)
    VALUES (?, ?)
  `;
  const insertReviewReplyCommentParams = [replyId, targetUserId];
  const [insertReviewReplyCommentRows] = await connection.query(
      insertReviewReplyCommentQuery,
      insertReviewReplyCommentParams
  );
  // connection.release();

  return insertReviewReplyCommentRows;
}

// 리뷰 댓글 답글 삭제
async function deleteReviewReplyComment(connection, commentId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const deleteReviewReplyCommentQuery = `
    UPDATE ReviewComment
    SET status = 0
    WHERE commentId = ?
  `;
  const deleteReviewReplyCommentParams = [commentId];
  const [deleteReviewReplyCommentRows] = await connection.query(
      deleteReviewReplyCommentQuery,
      deleteReviewReplyCommentParams
  );
  // connection.release();

  return deleteReviewReplyCommentRows;
}

// 라뷰 댓글 삭제
async function deleteReviewReply(replyId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const deleteReviewReplyQuery = `
    UPDATE ReviewReply
    SET status = 0
    WHERE replyId = ?
  `;
  const deleteReviewReplyParams = [replyId];
  const [deleteReviewReplyRows] = await connection.query(deleteReviewReplyQuery, deleteReviewReplyParams);
  connection.release();

  return deleteReviewReplyRows;
}

// 리뷰 댓글 유저 디바이스 토큰 가져오기
async function getReviewDeviceToken(connection, reviewId) {
  // const connection = await pool.getConnection(async (conn) => conn);
  const getReviewDeviceTokenQuery = `

    select userName, deviceToken
    from Review
           inner join User on User.userId = Review.userId
    where reviewId = ?
  `;
  const getReviewDeviceTokenParams = [reviewId];
  const [getReviewDeviceTokenRows] = await connection.query(getReviewDeviceTokenQuery, getReviewDeviceTokenParams);
  // connection.release();

  return getReviewDeviceTokenRows;
}

module.exports = {
  getAllReviews,
  getReview,
  restaurantLikeStatus,
  reviewLikeStatus,
  selectReviewReply,
  selectRevieReplyComment,
  selectReviewImgs,
  insertReview,
  insertReviewReplyComment,
  updateReviewReplyComment,
  deleteReviewReplyComment,
  updateReview,
  insertReviewImg,
  updateReviewImg,
  deleteReviewImg,
  deleteReview,
  selectReviewLike,
  insertReviewlike,
  updateReviewlike,
  insertReviewReply,
  updateReviewReply,
  deleteReviewReply,
  getReviewDeviceToken
};
