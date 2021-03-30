const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const axios = require("axios");

const paymentDao = require("../dao/paymentDao");

// 주문정보 등록
exports.insertOrderInfo = async function (req, res) {
  const { id } = req.verifiedToken;
  const { eatDealId } = req.body;

  if (typeof eatDealId !== "number") {
    return res.json({
      isSuccess: true,
      code: 2000,
      message: "eatDealId는 정수입니다.",
    });
  }
  try {
    const insertOrderInfoRows = await paymentDao.insertOrderInfo(id, eatDealId);

    return res.json({
      merchant_uid: insertOrderInfoRows.insertId,
      isSuccess: true,
      code: 1000,
      message: "주문번호 생성 성공",
    });
  } catch (err) {
    logger.error(`App - insertOrderInfoQuery error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 결제 정보 검증
exports.payment = async function (req, res) {
  const { imp_uid, merchant_uid } = req.body; // req의 body에서 imp_uid, merchant_uid 추출
  try {
    console.log(imp_uid, merchant_uid);

    // 액세스 토큰(access token) 발급 받기
    const getToken = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post", // POST method
      headers: { "Content-Type": "application/json" }, // "Content-Type": "application/json"
      data: {
        imp_key: "", // REST API키
        imp_secret: "", // REST API Secret
      },
    });
    const { access_token } = getToken.data.response; // 인증 토큰

    // imp_uid로 아임포트 서버에서 결제 정보 조회
    const getPaymentData = await axios({
      url: `https:\//api.iamport.kr/payments/${imp_uid}`, // imp_uid 전달
      method: "get", // GET method
      headers: { Authorization: access_token }, // 인증 토큰 Authorization header에 추가
    });
    const paymentData = getPaymentData.data.response; // 조회한 결제 정보

    // DB에서 결제되어야 하는 금액 조회
    const order = await paymentDao.findById(paymentData.merchant_uid);
    console.log(order);
    const amountToBePaid = order[0].amount; // 결제 되어야 하는 금액
    const { amount, apply_num, buyer_name, card_name, card_number, name, status } = paymentData;

    if (amount === amountToBePaid) {
      // 결제 금액 일치. 결제 된 금액 === 결제 되어야 하는 금액
      const findByIdAndUpdateRows = await paymentDao.findByIdAndUpdate(
        merchant_uid,
        apply_num,
        buyer_name,
        card_name,
        card_number,
        name,
        status
      ); // DB에 결제 정보 저장
      switch (status) {
        case "ready": // 가상계좌 발급
        case "paid": // 결제 완료
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "일반 결제 성공",
          });
      }
    } else {
      const cancelPaymentRows = await paymentDao.cancelPayment(merchant_uid);
      // 결제 금액 불일치. 위/변조 된 결제
      return res.json({
        isSuccess: false,
        code: 4000,
        message: "위조된 결제시도",
      });
    }
  } catch (err) {
    logger.error(`App - paymentQuery error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};
