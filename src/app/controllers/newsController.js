const {pool} = require("../../../config/database");
const {logger} = require("../../../config/winston");

const newsDao = require("../dao/newsDao");
const admin = require('firebase-admin');

// 리뷰 전체 조회
exports.getAllReviews = async function (req, res) {
    const {id} = req.verifiedToken;
    const {page, limit, locationfilter, expressionfilter} = req.query;
    let location = [];

    if (!/^([0-9]).{0,5}$/.test(page))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "page는 숫자입니다.",
        });

    if (!/^([0-9]).{0,5}$/.test(limit))
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "limit는 숫자입니다.",
        });

    for (let i = 0; i < locationfilter.length; i++) {
        if (
            !(
                locationfilter[i] === "1" ||
                locationfilter[i] === "2" ||
                locationfilter[i] === "3" ||
                locationfilter[i] === "0"
            )
        )
            return res.json({
                isSuccess: false,
                code     : 2002,
                message  : "locationfilter는 1, 2, 3 중 하나여야 합니다.",
            });
    }

    for (let i = 0; i < expressionfilter.length; i++) {
        if (
            !(
                expressionfilter[i] === "2" ||
                expressionfilter[i] === "1" ||
                expressionfilter[i] === "-1" ||
                expressionfilter[i] === "0"
            )
        )
            return res.json({
                isSuccess: false,
                code     : 2003,
                message  : "expressionfilter 2, 1, -1 중 하나여야 합니다.",
            });
    }

    // 위치 필터링
    if (locationfilter.includes("1")) {
        location.push("성북구");
    }
    if (locationfilter.includes("2")) {
        location.push("수유구");
        location.push("도봉구");
        location.push("강북구");
    }
    if (locationfilter.includes("3")) {
        location.push("노원구");
    }

    try {
        const getAllReviewsRows = await newsDao.getAllReviews(expressionfilter, location, Number(page), Number(limit));

        // 리뷰 이미지
        for (let i = 0; i < getAllReviewsRows.length; i++) {
            const selectReviewImgsRows = await newsDao.selectReviewImgs(getAllReviewsRows[i].reviewId);
            getAllReviewsRows[i].reviewImgList = selectReviewImgsRows;
        }

        // 식당 가고싶다 여부
        for (let i = 0; i < getAllReviewsRows.length; i++) {
            let restaurantLikeRows = await newsDao.restaurantLikeStatus(id, getAllReviewsRows[i].restaurantId);
            if (restaurantLikeRows.length > 0) {
                getAllReviewsRows[i].restaurantLikeStatus = 1;
            } else {
                getAllReviewsRows[i].restaurantLikeStatus = 0;
            }
        }

        // 리뷰 좋아요 여부
        for (let i = 0; i < getAllReviewsRows.length; i++) {
            let reviewLikeStatusRows = await newsDao.reviewLikeStatus(id, getAllReviewsRows[i].reviewId);
            if (reviewLikeStatusRows.length > 0) {
                getAllReviewsRows[i].reviewLikeStatus = 1;
            } else {
                getAllReviewsRows[i].reviewLikeStatus = 0;
            }
        }

        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "소식 전체 조회 성공",
            result   : getAllReviewsRows,
        });
    } catch (err) {
        logger.error(`App - getAllReviews Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 리뷰 상세 조회
exports.getReview = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId} = req.params;

    try {
        const getReviewRows = await newsDao.getReview(reviewId);
        if (getReviewRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 4000,
                message  : "reviewId에 존재하는 리뷰가 없습니다.",
            });
        }

        // 리뷰 이미지
        const selectReviewImgsRows = await newsDao.selectReviewImgs(getReviewRows[0].reviewId);
        getReviewRows[0].reviewImgList = selectReviewImgsRows;

        // 식당 가고싶다 여부
        let restaurantLikeRows = await newsDao.restaurantLikeStatus(id, getReviewRows[0].restaurantId);
        if (restaurantLikeRows.length > 0) {
            getReviewRows[0].restaurantLikeStatus = 1;
        } else {
            getReviewRows[0].restaurantLikeStatus = 0;
        }

        // 리뷰 좋아요 여부
        let reviewLikeStatusRows = await newsDao.reviewLikeStatus(id, getReviewRows[0].reviewId);
        if (reviewLikeStatusRows.length > 0) {
            getReviewRows[0].reviewLikeStatus = 1;
        } else {
            getReviewRows[0].reviewLikeStatus = 0;
        }

        // 리뷰 댓글
        const selectReviewReplyRows = await newsDao.selectReviewReply(getReviewRows[0].reviewId);
        for (let i = 0; i < selectReviewReplyRows.length; i++) {
            // 리뷰 댓글 답글
            let selectRevieReplyCommentRows = await newsDao.selectRevieReplyComment(selectReviewReplyRows[i].replyId);
            selectReviewReplyRows[i].commentUserList = selectRevieReplyCommentRows;
        }
        getReviewRows[0].reviewReplyList = selectReviewReplyRows;

        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 상세 조회 성공",
            result   : getReviewRows,
        });
    } catch (err) {
        logger.error(`App - getReview Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 리뷰 작성
exports.addReview = async function (req, res) {
    const {id} = req.verifiedToken;
    const {restaurantId, reviewExpression, reviewContents, reviewImgList} = req.body;

    const conn = await pool.getConnection(async (conn) => conn);

    if (typeof restaurantId !== "number") {
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "restaurantId는 정수를 입력하세요.",
        });
    }

    if (reviewExpression !== 1 && reviewExpression !== 2 && reviewExpression !== 3) {
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "reviewExpression은 2, 1, -1 중 하나를 입력하세요.",
        });
    }
    if (typeof reviewContents !== "string" && reviewContents.length > 10000) {
        return res.json({
            isSuccess: false,
            code     : 2002,
            message  : "reviewContents는 10000자 이하의 문자열입니다.",
        });
    }
    if (reviewImgList)
        for (let i = 0; i < reviewImgList.length; i++) {
            if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(reviewImgList[i])) {
                return res.json({
                    isSuccess: false,
                    code     : 2003,
                    message  : "reviewImgUrl을 Url형식에 맞게 입력하세요.",
                });
            }
        }

    try {
        await conn.beginTransaction();

        const insertReviewParams = [id, restaurantId, reviewExpression, reviewContents];
        const insertReviewRows = await newsDao.insertReview(conn, insertReviewParams);
        const reviewId = insertReviewRows.insertId;

        for (let i = 0; i < reviewImgList.length; i++) {
            let insertReviewImgParams = [restaurantId, reviewId, reviewImgList[i]];
            let insertReviewImgRows = await newsDao.insertReviewImg(conn, insertReviewImgParams);
        }

        await conn.commit();
        return res.json({
            reviewId : reviewId,
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 추가 성공",
        });
    } catch (err) {
        await conn.rollback();
        logger.error(`App - addReview Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    } finally {
        conn.release();
    }
};

// 리뷰 수정
exports.updateReview = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId} = req.params;
    const {restaurantId, reviewExpression, reviewContents, reviewImgList} = req.body;

    const conn = await pool.getConnection(async (conn) => conn);

    if (typeof restaurantId !== "number") {
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "restaurantId는 정수를 입력하세요.",
        });
    }

    if (reviewExpression !== 1 && reviewExpression !== 2 && reviewExpression !== 3) {
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "reviewExpression은 2, 1, -1 중 하나를 입력하세요.",
        });
    }
    if (typeof reviewContents !== "string" && reviewContents.length > 10000) {
        return res.json({
            isSuccess: false,
            code     : 2002,
            message  : "reviewContents는 10000자 이하의 문자열입니다.",
        });
    }
    if (reviewImgList)
        for (let i = 0; i < reviewImgList.length; i++) {
            if (!/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(reviewImgList[i])) {
                return res.json({
                    isSuccess: false,
                    code     : 2003,
                    message  : "reviewImgUrl을 Url형식에 맞게 입력하세요.",
                });
            }
        }

    try {
        const updateReviewParams = [id, restaurantId, reviewExpression, reviewContents, reviewId];
        const updateReviewRows = await newsDao.updateReview(conn, updateReviewParams);

        const selectReviewImgsRows = await newsDao.selectReviewImgs(reviewId);

        await conn.beginTransaction();
        // 이미지 갯수의 추가나 삭제가 없는 경우
        if (reviewImgList.length === selectReviewImgsRows.length) {
            for (let i = 0; i < reviewImgList.length; i++) {
                const reviewImgParams = [reviewImgList[i], selectReviewImgsRows[i].imgId];
                const updateReviewImgRows = await newsDao.updateReviewImg(conn, reviewImgParams);
            }
            // 추가가 있는 경우
        } else if (reviewImgList.length > selectReviewImgsRows.length) {
            for (let i = selectReviewImgsRows.length; i < reviewImgList.length; i++) {
                let insertReviewImgParams = [restaurantId, reviewId, reviewImgList[i]];
                let insertReviewImgRows = await newsDao.insertReviewImg(conn, insertReviewImgParams);
            }
            // 삭제가 있는 경우
        } else {
            for (let i = 0; i < reviewImgList.length; i++) {
                const reviewImgParams = [reviewImgList[i], selectReviewImgsRows[i].imgId];
                const updateReviewImgRows = await newsDao.updateReviewImg(conn, reviewImgParams);
            }
            for (let i = reviewImgList.length; i < selectReviewImgsRows.length; i++) {
                let deleteReviewImgRows = await newsDao.deleteReviewImg(conn, selectReviewImgsRows[i].imgId);
            }
        }

        await conn.commit();
        return res.json({
            reviewId : reviewId,
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 수정 성공",
        });
    } catch (err) {
        await conn.rollback();
        logger.error(`App - updateReview Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    } finally {
        conn.release();
    }
};

// 리뷰 삭제
exports.deleteReview = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId} = req.params;
    try {
        const getReviewRows = await newsDao.getReview(reviewId);

        if (getReviewRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "reviewId에 존재하는 review가 없습니다.",
            });
        }

        if (getReviewRows[0].userId !== id) {
            return res.json({
                isSuccess: false,
                code     : 2001,
                message  : "권한이 없습니다.",
            });
        }

        const deleteReviewRows = await newsDao.deleteReview(reviewId);
        if (deleteReviewRows.affectedRows === 0) {
            return res.json({
                isSuccess: false,
                code     : 4000,
                message  : "리뷰 삭제 실패",
            });
        }
        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 삭제 성공",
        });
    } catch (err) {
        logger.error(`App - deleteReview Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 리뷰 좋아요 추가, 헤제
exports.reviewLike = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId} = req.params;
    try {
        const reviewLikeRows = await newsDao.selectReviewLike(id, reviewId);
        if (reviewLikeRows.length > 0) {
            const updateReviewlikeRows = await newsDao.updateReviewlike(id, reviewId);
            if (reviewLikeRows[0].status === 0)
                return res.json({
                    isSuccess: true,
                    code     : 1000,
                    message  : "리뷰 좋아요 추가 성공",
                });
            else {
                return res.json({
                    isSuccess: true,
                    code     : 1001,
                    message  : "리뷰 좋아요 헤제 성공",
                });
            }
        } else {
            const insertReviewlikeRows = await newsDao.insertReviewlike(id, reviewId);
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "리뷰 좋아요 추가 성공",
            });
        }
    } catch (err) {
        logger.error(`App - reviewLikeRows Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 리뷰 댓글 작성
exports.addReply = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId} = req.params;
    const {replyContents, commentUserList} = req.body;

    const conn = await pool.getConnection(async (conn) => conn);

    if (commentUserList)
        for (let i = 0; i < commentUserList.length; i++) {
            if (typeof commentUserList[i] !== "number") {
                return res.json({
                    isSuccess: false,
                    code     : 2000,
                    message  : "commentUserId는 정수를 입력하세요.",
                });
            }
        }

    if (typeof replyContents !== "string" && replyContents.length > 500) {
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "replyContents는 500자이하의 문자열입니다.",
        });
    }

    try {
        await conn.beginTransaction();
        const getReviewDeviceTokenRows = await newsDao.getReviewDeviceToken(conn, reviewId);

        const insertReviewReplyRows = await newsDao.insertReviewReply(conn, reviewId, id, replyContents);
        if (commentUserList)
            for (let i = 0; i < commentUserList.length; i++) {
                let insertReviewReplyCommentRows = await newsDao.insertReviewReplyComment(
                    conn,
                    insertReviewReplyRows.insertId,
                    commentUserList[i]
                );
            }
        if (insertReviewReplyRows.affectedRows > 0) {

            let message = {
                notification: {
                    title: '망고플레이트 알람🥝',
                    body : getReviewDeviceTokenRows[0].userName + '님이 작성하신 리뷰에 댓글이 달렸습니다🍋',
                },
                data        : {
                    title: '망고플레이트 알람🥝',
                    body : getReviewDeviceTokenRows[0].userName + '님이 작성하신 리뷰에 댓글이 달렸습니다🍋',
                },
                token       : getReviewDeviceTokenRows[0].deviceToken,
            }
            admin
                .messaging()
                .send(message)
                .then(function (response) {
                    console.log('Successfully sent message : ', response)
                })
                .catch(function (err) {
                    console.log('Error Sending message : ', err)
                });

            await conn.commit();
            return res.json({
                replyId  : insertReviewReplyRows.insertId,
                isSuccess: true,
                code     : 1000,
                message  : "리뷰 댓글 작성 성공",
            });
        } else {
            return res.json({
                isSuccess: true,
                code     : 4000,
                message  : "리뷰 댓글 작성 실패",
            });
        }
    } catch (err) {
        await conn.rollback();
        logger.error(`App - addReply Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    } finally {
        conn.release();
    }
};

// 리뷰 댓글 수정
exports.updateReply = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId, replyId} = req.params;
    const {replyContents, commentUserList} = req.body;

    const conn = await pool.getConnection(async (conn) => conn);

    if (commentUserList)
        for (let i = 0; i < commentUserList.length; i++) {
            if (typeof commentUserList[i] !== "number") {
                return res.json({
                    isSuccess: false,
                    code     : 2000,
                    message  : "commentUserId는 정수를 입력하세요.",
                });
            }
        }

    if (typeof replyContents !== "string" && replyContents.length > 500) {
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "replyContents는 500자이하의 문자열입니다.",
        });
    }

    try {
        const getReviewRows = await newsDao.selectReviewReply(reviewId);
        let replyUserId = 0;
        for (let i = 0; i < getReviewRows.length; i++) {
            if (getReviewRows[i].replyId === Number(replyId)) {
                replyUserId = getReviewRows[i].replyUserId;
            }
        }

        if (replyUserId === 0) {
            return res.json({
                isSuccess: false,
                code     : 2002,
                message  : "replyId 존재하는 reply가 없습니다.",
            });
        }

        if (replyUserId !== id) {
            return res.json({
                isSuccess: false,
                code     : 2003,
                message  : "권한이 없습니다.",
            });
        }
        await conn.beginTransaction();

        const updateReviewReplyRows = await newsDao.updateReviewReply(conn, replyId, replyContents);
        const selectRevieReplyCommentRows = await newsDao.selectRevieReplyComment(replyId);
        if (selectRevieReplyCommentRows.length === commentUserList.length) {
            for (let i = 0; i < commentUserList.length; i++) {
                let updateReviewReplyCommentRows = await newsDao.updateReviewReplyComment(
                    conn,
                    selectRevieReplyCommentRows[i].commentId,
                    commentUserList[i]
                );
            }
        } else if (selectRevieReplyCommentRows.length < commentUserList.length) {
            for (let i = selectRevieReplyCommentRows.length; i < commentUserList.length; i++) {
                let insertReviewReplyCommentRows = await newsDao.insertReviewReplyComment(conn, replyId, commentUserList[i]);
            }
        } else {
            for (let i = 0; i < commentUserList.length; i++) {
                let updateReviewReplyCommentRows = await newsDao.updateReviewReplyComment(
                    conn,
                    selectRevieReplyCommentRows[i].commentId,
                    commentUserList[i]
                );
            }
            for (let i = commentUserList.length; i < selectRevieReplyCommentRows.length; i++) {
                let deleteReviewReplyCommentRows = await newsDao.deleteReviewReplyComment(
                    conn,
                    selectRevieReplyCommentRows[i].commentId
                );
            }
        }
        if (updateReviewReplyRows.affectedRows === 0) {
            await conn.commit();
            return res.json({
                isSuccess: false,
                code     : 4000,
                message  : "리뷰 댓글 수정 실패",
            });
        }
        await conn.commit();
        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 댓글 수정 성공",
        });
    } catch (err) {
        await conn.rollback();
        logger.error(`App - updateReply Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    } finally {
        conn.release();
    }
};

// 리뷰 댓글 삭제
exports.deleteReply = async function (req, res) {
    const {id} = req.verifiedToken;
    const {reviewId, replyId} = req.params;
    try {
        const getReviewRows = await newsDao.selectReviewReply(reviewId);
        let replyUserId = 0;
        for (let i = 0; i < getReviewRows.length; i++) {
            if (getReviewRows[i].replyId === Number(replyId)) {
                replyUserId = getReviewRows[i].replyUserId;
            }
        }

        if (replyUserId === 0) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "replyId 존재하는 reply가 없습니다.",
            });
        }

        if (replyUserId !== id) {
            return res.json({
                isSuccess: false,
                code     : 2001,
                message  : "권한이 없습니다.",
            });
        }

        const deleteReviewReplyRows = await newsDao.deleteReviewReply(replyId);
        if (deleteReviewReplyRows.affectedRows === 0) {
            return res.json({
                isSuccess: false,
                code     : 4000,
                message  : "리뷰 삭제 실패",
            });
        }
        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "리뷰 삭제 성공",
        });
    } catch (err) {
        logger.error(`App - deleteReply Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};
