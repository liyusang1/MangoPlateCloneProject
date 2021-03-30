const { pool } = require("../../../config/database");

// 주문정보 등록
async function insertOrderInfo(userId, eatDealId) {
  const connection = await pool.getConnection(async (conn) => conn);
  const insertOrderInfoQuery = `
  INSERT INTO OrderTable (userId, eatDealId)
  VALUES(?, ?);
  `;
  const insertOrderInfoParmas = [userId, eatDealId];
  const [insertOrderInfoRows] = await connection.query(insertOrderInfoQuery, insertOrderInfoParmas);
  connection.release();

  return insertOrderInfoRows;
}

// 결제되어야 하는 금액 조회
async function findById(merchant_uid) {
  const connection = await pool.getConnection(async (conn) => conn);
  const findByIdQuery = `
  SELECT EatDeal.eatDealId, eatDealName, eatDealAfterPrice as amount
  FROM OrderTable inner join EatDeal on OrderTable.eatDealId = EatDeal.eatDealId
  WHERE merchant_uid = ? and OrderTable.status = "ready"
  `;
  const findByIdParmas = [merchant_uid];
  const [findByIdRows] = await connection.query(findByIdQuery, findByIdParmas);
  connection.release();

  return findByIdRows;
}

// 결제 정보 저장
async function findByIdAndUpdate(merchant_uid, apply_num, buyer_name, card_name, card_number, merchandiseName, status) {
  const connection = await pool.getConnection(async (conn) => conn);
  const findByIdAndUpdateQuery = `
  Update OrderTable
  SET apply_num = ?, buyer_name = ?, card_name = ?, card_number = ?, merchandiseName = ?, status = ?
  WHERE merchant_uid = ?
  `;
  const findByIdAndUpdateParmas = [
    apply_num,
    buyer_name,
    card_name,
    card_number,
    merchandiseName,
    status,
    merchant_uid,
  ];
  const [findByIdAndUpdateRows] = await connection.query(findByIdAndUpdateQuery, findByIdAndUpdateParmas);
  connection.release();

  return findByIdAndUpdateRows;
}

// 결제 취소
async function cancelPayment(merchant_uid) {
  const connection = await pool.getConnection(async (conn) => conn);
  const cancelPaymentQuery = `
  Update OrderTable
  SET status = canceled 
  WHERE merchant_uid = ?
  `;
  const cancelPaymentParmas = [merchant_uid];
  const [cancelPaymentRows] = await connection.query(cancelPaymentQuery, cancelPaymentParmas);
  connection.release();

  return cancelPaymentRows;
}

module.exports = {
  insertOrderInfo,
  findById,
  findByIdAndUpdate,
};
