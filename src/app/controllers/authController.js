const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const request = require("request");

const authDao = require("../dao/authDao");

const jwt = require("jsonwebtoken");
const secret_config = require("../../../config/secret");

// 카카오 로그인
exports.kakaoLogIn = async function (req, res) {
  const { kakaoToken,deviceToken } = req.body;

  // 토큰 유효성 검증
  function isValidToken() {
    return new Promise((resolve, reject) => {
      request(
        {
          uri: "https://kapi.kakao.com/v1/user/access_token_info",
          method: "GET",
          headers: {
            Authorization: `Bearer ${kakaoToken}`,
          },
        },
        function (err, response, body) {
          if (!err && response.statusCode === 200) {
            resolve(response.statusCode);
          } else {
            reject(err);
          }
        }
      );
    });
  }
  try {
    let tokenLows = "";
    await (async () => {
      tokenLows = await isValidToken();
    })();
  } catch {
    return res.json({
      isSuccess: false,
      code: 3001,
      message: "올바른 Acess Token을 입력하세요.",
    });
  }

  // 사용자 정보 가져오기
  const options = {
    uri: "https://kapi.kakao.com/v2/user/me",
    method: "GET",
    headers: {
      Authorization: `Bearer ${kakaoToken}`,
    },
  };

  function getUserInfo(options) {
    return new Promise((resolve, reject) => {
      request(options, function (err, res, body) {
        if (res.statusCode === 200) {
          resolve(body);
        } else {
          reject(err);
        }
      });
    });
  }

  try {
    let userInfoRows = "";
    await (async () => {
      userInfoRows = await getUserInfo(options);
      userInfoRows = JSON.parse(userInfoRows);
    })();
    const { id } = userInfoRows;
    const { nickname, profile_image, thumbnail_image } = userInfoRows.properties;

    // 이미 가입된 계정인 경우
    const checkUserRows = await authDao.checkUser(id);
    if (checkUserRows.length > 0) {

      //디바이스 토큰 값 업데이트
      const updateDeviceTokenParams = [deviceToken,checkUserRows[0].userId]
      const updateDeviceTokenRows = await authDao.updateDeviceToken(updateDeviceTokenParams);

      let token = await jwt.sign(
        {
          id: checkUserRows[0].userId,
        }, // 토큰의 내용(payload)
        secret_config.jwtsecret, // 비밀 키
        {
          expiresIn: "365d",
          subject: "userInfo",
        } // 유효 시간은 365일
      );
      return res.json({
        userId: checkUserRows[0].userId,
        jwt: token,
        isSuccess: true,
        code: 1000,
        message: "로그인 성공",
      });
    }

    const insertUserInfoParmas = [id, nickname, thumbnail_image, "kakao",deviceToken];
    const insertUserInfoRows = await authDao.insertUserInfo(insertUserInfoParmas);
    if (insertUserInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 3000,
        message: "로그인 실패",
      });
    }

    let token = await jwt.sign(
      {
        id: insertUserInfoRows[0].insertedId,
      }, // 토큰의 내용(payload)
      secret_config.jwtsecret, // 비밀 키
      {
        expiresIn: "365d",
        subject: "userInfo",
      } // 유효 시간은 365일
    );

    return res.json({
      userId: insertUserInfoRows[0].insertedId,
      jwt: token,
      isSuccess: true,
      code: 1000,
      message: "로그인 성공",
    });
  } catch (err) {
    logger.error(`App - kakaoLogIn Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 페이스북 로그인
exports.facebookLogIn = async function (req, res) {
  const { facebookToken,deviceToken } = req.body;

  // 토큰 유효성 검증
  function isValidToken() {
    return new Promise((resolve, reject) => {
      request(
        {
          uri: ``,
          method: "GET",
        },
        function (err, response, body) {
          if (!err && response.statusCode === 200 && JSON.parse(body).data.is_valid === true) {
            resolve(response.statusCode);
          } else {
            reject(err);
          }
        }
      );
    });
  }
  try {
    let tokenLows = "";
    await (async () => {
      tokenLows = await isValidToken();
    })();
  } catch {
    return res.json({
      isSuccess: false,
      code: 3001,
      message: "올바른 Acess Token을 입력하세요.",
    });
  }

  // 사용자 정보 가져오기
  const options = {
    uri: `https://graph.facebook.com/me?access_token=${facebookToken}`,
    method: "GET",
  };

  function getUserInfo(options) {
    return new Promise((resolve, reject) => {
      request(options, function (err, res, body) {
        if (res.statusCode === 200) {
          resolve(body);
        } else {
          reject(err);
        }
      });
    });
  }

  try {
    let userInfoRows = "";
    await (async () => {
      userInfoRows = await getUserInfo(options);
      userInfoRows = JSON.parse(userInfoRows);
    })();
    const { id, name } = userInfoRows;
    const profile_image = `http://graph.facebook.com/${id}/picture`;

    // 이미 가입된 계정인 경우
    const checkUserRows = await authDao.checkUser(id);
    if (checkUserRows.length > 0) {
      if (checkUserRows.length > 0) {

        //디바이스 토큰 값 업데이트
      const updateDeviceTokenParams = [deviceToken,checkUserRows[0].userId]
      const updateDeviceTokenRows = await authDao.updateDeviceToken(updateDeviceTokenParams);

        let token = await jwt.sign(
          {
            id: checkUserRows[0].userId,
          }, // 토큰의 내용(payload)
          secret_config.jwtsecret, // 비밀 키
          {
            expiresIn: "365d",
            subject: "userInfo",
          } // 유효 시간은 365일
        );
        console.log(userInfoRows);

        return res.json({
          userId: checkUserRows[0].userId,
          jwt: token,
          isSuccess: true,
          code: 1000,
          message: "로그인 성공",
        });
      }
    }

    const insertUserInfoParmas = [id, name, profile_image, "facebook",deviceToken];
    const insertUserInfoRows = await authDao.insertUserInfo(insertUserInfoParmas);
    if (insertUserInfoRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 3000,
        message: "로그인 실패",
      });
    }
    let token = await jwt.sign(
      {
        id: insertUserInfoRows[0].insertedId,
      }, // 토큰의 내용(payload)
      secret_config.jwtsecret, // 비밀 키
      {
        expiresIn: "365d",
        subject: "userInfo",
      } // 유효 시간은 365일
    );

    return res.json({
      userId: insertUserInfoRows[0].insertedId,
      jwt: token,
      isSuccess: true,
      code: 1000,
      message: "로그인 성공",
    });
  } catch (err) {
    logger.error(`App - facebookLogIn Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
