const {pool} = require("../../../config/database");

// 회원가입
async function insertUserInfo(insertUserInfoParmas) {
    const connection = await pool.getConnection(async (conn) => conn);
    const insertUserInfoQuery = `
        INSERT INTO User (authId, userName, userProfileImgUrl, authStrategy, deviceToken)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [insertUserInfoRows] = await connection.query(insertUserInfoQuery, insertUserInfoParmas);
    connection.release();

    return [insertUserInfoRows];
}

// 이미가입된 계정인지 확인
async function checkUser(authId) {
    const connection = await pool.getConnection(async (conn) => conn);
    const checkUserQuery = `
        SELECT userId
        from User
        where authId = ?
    `;
    const [checkUserRows] = await connection.query(checkUserQuery, [authId]);
    connection.release();

    return checkUserRows;
}

// 디바이스 토큰 업데이트
async function updateDeviceToken(updateDeviceTokenParams) {
    const connection = await pool.getConnection(async (conn) => conn);
    const updateDeviceTokenQuery = `
        update User
        set deviceToken =?
        where userId = ?
    `;
    const [updateDeviceTokenRows] = await connection.query(updateDeviceTokenQuery, updateDeviceTokenParams);
    connection.release();

    return updateDeviceTokenRows;
}

module.exports = {
    insertUserInfo,
    checkUser,
    updateDeviceToken
};
