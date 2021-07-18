const {pool} = require("../../../config/database");

// 프로필 조회
async function selectUserInfo(userId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const selectUserInfoQuery = `
        SELECT User.userId,
               userProfileImgUrl,
               userName,
               ifnull(userEmail, -1)         as userEmail,
               ifnull(userPhoneNumber, -1)   as userPhoneNumber,
               ifnull(userFollowerCount, 0)  as userFollowerCount,
               ifnull(userFollowingCount, 0) as userFollowingCount,
               ifnull(userReviewCount, 0)    as userReviewCount,
               ifnull(userVisitedCount, 0)   as userVisitedCount,
               ifnull(userUploadImgCount, 0) as userUploadImgCount,
               ifnull(userLikeCount, 0)      as userLikeCount,
               ifnull(myListCount, 0)        as userMyListCount,
               ifnull(bookMarkCount, 0)      as userBookMarkCount
        FROM User
                 left outer join (select userId, count(*) as userFollowingCount
                                  from Follow
                                  group by userId) FollowingCount
                                 on User.userId = FollowingCount.userId
                 left outer join (select targetUserId, count(*) as userFollowerCount
                                  from Follow
                                  group by targetUserId) FollowCount
                                 on User.userId = FollowCount.targetUserId
                 left outer join (select userId, count(*) as userReviewCount
                                  from Review
                                  group by userId) ReviewCount
                                 on User.userId = ReviewCount.userId
                 left outer join (select userId, count(*) as userVisitedCount
                                  from RestaurantVisited
                                  group by userId) visitedCount
                                 on User.userId = visitedCount.userId
                 left outer join (select userId, count(*) as userUploadImgCount
                                  from ReviewImg
                                           inner join Review on ReviewImg.reviewId = Review.reviewId
                                  group by userId) imgCount on User.userId = imgCount.userId
                 left outer join (select userId, count(*) as userLikeCount
                                  from RestaurantLike
                                  group by userId) likeCount
                                 on User.userId = likeCount.userId
                 left outer join (select userId, count(*) as bookMarkCount
                                  from TopListBookMark
                                  group by userId) bookMarkCount
                                 on User.userId = bookMarkCount.userId
                 left outer join (select userId, count(*) as myListCount
                                  from MyList
                                  group by userId) myListCount
                                 on User.userId = myListCount.userId
        where User.userId = ?
          and User.status = 1
    `;
    const selectUserInfoParmas = [userId];
    const [selectUserInfoRows] = await connection.query(selectUserInfoQuery, selectUserInfoParmas);
    connection.release();

    return selectUserInfoRows;
}

// 내정보 수정(이름)
async function updateUserName(userId, userData) {
    const connection = await pool.getConnection(async (conn) => conn);
    const updateUserNameQuery = `
        UPDATE User
        SET userName = ?
        WHERE userId = ?
    `;
    const updateUserNameParmas = [userData, userId];
    const [updateUserNameRows] = await connection.query(updateUserNameQuery, updateUserNameParmas);
    connection.release();

    return updateUserNameRows;
}

// 내정보 수정(프로필 사진)
async function updateUserProfileImgUrl(userId, userData) {
    const connection = await pool.getConnection(async (conn) => conn);
    const updateUserNameQuery = `
        UPDATE User
        SET userProfileImgUrl = ?
        WHERE userId = ?
    `;
    const updateUserNameParmas = [userData, userId];
    const [updateUserProfileImgUrlRows] = await connection.query(updateUserNameQuery, updateUserNameParmas);
    connection.release();

    return updateUserProfileImgUrlRows;
}

// 내정보 수정(이메일)
async function updateUserEmail(userId, userData) {
    const connection = await pool.getConnection(async (conn) => conn);
    const updateUserNameQuery = `
        UPDATE User
        SET userEmail = ?
        WHERE userId = ?
    `;
    const updateUserNameParmas = [userData, userId];
    const [updateUserEmailRows] = await connection.query(updateUserNameQuery, updateUserNameParmas);
    connection.release();

    return updateUserEmailRows;
}

// 내정보 수정(휴대전화번호)
async function updateUserPhoneNumber(userId, userData) {
    const connection = await pool.getConnection(async (conn) => conn);
    const updatePhoneNumberQuery = `
        UPDATE User
        SET userPhoneNumber = ?
        WHERE userId = ?
    `;
    const updatePhoneNumberParmas = [userData, userId];
    const [updateUserPhoneNumberRows] = await connection.query(updatePhoneNumberQuery, updatePhoneNumberParmas);
    connection.release();

    return updateUserPhoneNumberRows;
}

// 팔로워
async function selectFollower(userId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const selectFollowerQuery = `
        SELECT UserInfo.userId,
               userProfileImgUrl,
               userName,
               case
                   when userReviewCount >= 10 then 1
                   when userReviewCount < 10 then 0
                   end                      as isHolic,
               ifnull(userReviewCount, 0)   as userReviewCount,
               ifnull(userFollowerCount, 0) as userFollowerCount
        FROM Follow
                 inner join (select U.userId, userName, userProfileImgUrl, userReviewCount, userFollowerCount
                             from User U
                                      left outer join (select userId, count(*) as userFollowingCount
                                                       from Follow
                                                       group by userId) FollowingCount
                                                      on U.userId = FollowingCount.userId
                                      left outer join (select targetUserId, count(*) as userFollowerCount
                                                       from Follow
                                                       group by targetUserId) FollowCount
                                                      on U.userId = FollowCount.targetUserId
                                      left outer join (select userId, count(*) as userReviewCount
                                                       from Review
                                                       group by userId) ReviewCount
                                                      on U.userId = ReviewCount.userId) UserInfo
                            on UserInfo.userId = Follow.userId
        where Follow.targetUserId = ?
    `;
    const selectFollowerParmas = [userId];
    const [selectFollowerRows] = await connection.query(selectFollowerQuery, selectFollowerParmas);
    connection.release();

    return selectFollowerRows;
}

// 팔로잉
async function selectFollowing(userId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const selectFollowerQuery = `
        SELECT UserInfo.userId,
               userProfileImgUrl,
               userName,
               case
                   when userReviewCount >= 10 then 1
                   when userReviewCount < 10 then 0
                   end                      as isHolic,
               ifnull(userReviewCount, 0)   as userReviewCount,
               ifnull(userFollowerCount, 0) as userFollowerCount
        FROM Follow
                 inner join (select U.userId, userName, userProfileImgUrl, userReviewCount, userFollowerCount
                             from User U
                                      left outer join (select userId, count(*) as userFollowingCount
                                                       from Follow
                                                       group by userId) FollowingCount
                                                      on U.userId = FollowingCount.userId
                                      left outer join (select targetUserId, count(*) as userFollowerCount
                                                       from Follow
                                                       group by targetUserId) FollowCount
                                                      on U.userId = FollowCount.targetUserId
                                      left outer join (select targetUserId, count(*) as userFollowerCount
                                                       from Follow
                                                       group by targetUserId) FollowCount
                                                      on U.userId = FollowCount.targetUserId
                                      left outer join (select userId, count(*) as userReviewCount
                                                       from Review
                                                       group by userId) ReviewCount
                                                      on U.userId = ReviewCount.userId) UserInfo
                            on UserInfo.userId = Follow.targetUserId
        where Follow.userId = ?
    `;
    const selectFollowerParmas = [userId];
    const [selectFollowerRows] = await connection.query(selectFollowerQuery, selectFollowerParmas);
    connection.release();

    return selectFollowerRows;
}

// 유저 체크
async function checkUserIndex(userId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const checkUserIndexQuery = `

        select userName
        from User
        where userId = ?;

    `;
    const [checkUserIndexRows] = await connection.query(checkUserIndexQuery, userId);
    connection.release();

    return checkUserIndexRows;
}

// 팔로잉 체크
async function checkFollowing(followingParams) {
    const connection = await pool.getConnection(async (conn) => conn);
    const checkFollowingQuery = `

        select *
        from Follow
        where userId = ?
          and targetUserId = ?

    `;
    const [checkFollowingRows] = await connection.query(checkFollowingQuery, followingParams);
    connection.release();

    return checkFollowingRows;
}

// 팔로잉 생성
async function postFollowing(followingParams) {
    const connection = await pool.getConnection(async (conn) => conn);
    const postFollowingQuery = `

        insert into Follow (userId, targetUserId, status)
        values (?, ?, 1);

    `;
    const [postFollowingRows] = await connection.query(postFollowingQuery, followingParams);
    connection.release();

    return postFollowingRows;
}

// 팔로잉 상태 변경
async function patchFollowing(followingParams) {
    const connection = await pool.getConnection(async (conn) => conn);
    const patchFollowingQuery = `

        update Follow
        set status= if(status = 1, 0, 1)
        where userId = ?
          and targetUserId = ?;

    `;
    const [patchFollowingRows] = await connection.query(patchFollowingQuery, followingParams);
    connection.release();

    return patchFollowingRows;
}

// 회원 탈퇴
async function deleteUser(userId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const deleteUserQuery = `
        UPDATE User
        SET status = 0
        WHERE userId = ?
    `;
    const deleteUserParams = [userId];
    const [deleteUserRows] = await connection.query(deleteUserQuery, deleteUserParams);
    connection.release();

    return deleteUserRows;
}

module.exports = {
    selectUserInfo,
    updateUserName,
    updateUserProfileImgUrl,
    updateUserEmail,
    updateUserPhoneNumber,
    selectFollower,
    selectFollowing,
    checkUserIndex,
    checkFollowing,
    postFollowing,
    patchFollowing,
    deleteUser,
};
