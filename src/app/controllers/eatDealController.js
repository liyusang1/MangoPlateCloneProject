const {pool} = require("../../../config/database");
const {logger} = require("../../../config/winston");

const eatDealDao = require("../dao/eatDealDao");

const admin = require('firebase-admin');

//////////////////////////////////pushAlarm Test////////////////////////////////
exports.pushAlarm = async function (req, res) {

    const {id} = req.verifiedToken;

    const getDeviceTokenRows = await eatDealDao.getDeviceToken(id);

    let message = {
        notification: {
            title: '테스트 발송💛',
            body : getDeviceTokenRows[0].userName + '님 망고플레이트 앱을 확인해보세요!💚',
        },
        data        : {
            title: '테스트 발송💛',
            body : getDeviceTokenRows[0].userName + '님 망고플레이트 앱을 확인해보세요!💚',
        },
        token       : getDeviceTokenRows[0].deviceToken,
    }

    admin
        .messaging()
        .send(message)
        .then(function (response) {
            console.log('Successfully sent message: : ', response)
            return res.status(200).json({success: true})
        })
        .catch(function (err) {
            console.log('Error Sending message!!! : ', err)
            return res.status(400).json({success: false})
        });
}
//////////////////////////////////pushAlarm Test////////////////////////////////

// 잇딜 조회 지역 필터 있음.
exports.getEatDeal = async function (req, res) {
    const {id} = req.verifiedToken;
    const {page, limit, locationfilter} = req.query;
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

        const getEatDealRows = await eatDealDao.getEatDeal(location, Number(page), Number(limit));

        if (getEatDealRows.length >= 0)
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : getEatDealRows,
            });

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getEatDeal Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 모든 EAT딜 보기
exports.getAllEatDeal = async function (req, res) {
    const {id} = req.verifiedToken;
    const {page, limit} = req.query;

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

    try {

        const getEatDealParams = [Number(page), Number(limit)]
        const getEatDealRows = await eatDealDao.getAllEatDeal(getEatDealParams);

        if (getEatDealRows.length >= 0) {

            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : getEatDealRows,
            });
        }

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getAllEatDeal Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// EAT딜 상세 보기
exports.getEatDealDetail = async function (req, res) {
    const {id} = req.verifiedToken;
    const {eatDealId} = req.params;

    if (!/^([0-9]).{0,100}$/.test(eatDealId))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "eatDealId는 숫자입니다.",
        });

    try {

        const checkEatDealIdRows = await eatDealDao.checkEatDealId(eatDealId);

        if (checkEatDealIdRows.length < 1)
            return res.json({
                isSuccess: true,
                code     : 4001,
                message  : "해당 인덱스와 일치하는 잇딜이 없습니다.",
            });

        const getEatDealImgRows = await eatDealDao.getEatDealImg(eatDealId);
        const getEatDealDetailRows = await eatDealDao.getEatDealDetail(eatDealId);

        if (getEatDealDetailRows.length >= 0 && getEatDealImgRows.length >= 0)
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : {images: getEatDealImgRows, info: getEatDealDetailRows}
            });

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getEatDealDetail Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// EAT딜 내 주변
exports.getEatDealFromUser = async function (req, res) {
    const {id} = req.verifiedToken;
    const {userlatitude, userlongtitude, limit, page} = req.query;

    if (!/^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/.test(userlatitude))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "올바른 userlatitude 입력하세요.",
        });

    if (!/^-?(([-+]?)([\d]{1,3})((\.)(\d+))?)/.test(userlongtitude))
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "올바른 userlongtitude 입력하세요.",
        });


    if (!/^([0-9]).{0,5}$/.test(page))
        return res.json({
            isSuccess: false,
            code     : 2002,
            message  : "page는 숫자입니다.",
        });

    if (!/^([0-9]).{0,5}$/.test(limit))
        return res.json({
            isSuccess: false,
            code     : 2003,
            message  : "limit는 숫자입니다.",
        });

    try {

        //유저의 위도 경도
        const userLocationParams = [userlatitude, userlongtitude];

        const pagingParams = [Number(page), Number(limit)];

        //유저의 위도경도 변수에 저장
        const setUserLocation = await eatDealDao.setUserLocation(userLocationParams);

        //유저 위도 경도 기반으로 가까운 잇딜(3킬로 이하)만 보여줌.
        const getEatDealRows = await eatDealDao.getEatDealFromUserLocation(pagingParams);

        //distanceFromUser는 클라쪽에 필요없는 값.
        for (let i = 0; i < getEatDealRows.length; i++)
            getEatDealRows[i].distanceFromUser = undefined

        if (getEatDealRows.length >= 0)
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : getEatDealRows
            });

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getEatDealFromUser Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// TopList 가져오기
exports.getAllTopList = async function (req, res) {
    const {id} = req.verifiedToken;
    const {limit, page} = req.query;

    if (!/^([0-9]).{0,5}$/.test(page))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "page는 숫자입니다.",
        });

    if (!/^([0-9]).{0,5}$/.test(limit))
        return res.json({
            isSuccess: false,
            code     : 2003,
            message  : "limit는 숫자입니다.",
        });

    try {

        const topListParams = [id, Number(page), Number(limit)]

        //toplist전부 가져오기
        const getAllTopListRows = await eatDealDao.getAllTopListInfo(topListParams);

        if (getAllTopListRows.length >= 0)
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : getAllTopListRows
            });

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getAllTopList Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// TopList 북마크 등록 및 해제
exports.patchTopList = async function (req, res) {
    const {id} = req.verifiedToken;
    const {topListId} = req.params;

    if (!/^([0-9]).{0,100}$/.test(topListId))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "topListId는 숫자입니다.",
        });

    try {

        //toplist check
        const topListAvailableRows = await eatDealDao.checkTopList(topListId);

        if (topListAvailableRows.length < 1)
            return res.json({
                isSuccess: true,
                code     : 4000,
                message  : "해당 인덱스와 맞는 TopList가 없습니다.",
            });

        const topListParams = [topListId, id]

        //toplist check
        const checkTopListRows = await eatDealDao.checkTopListBookMark(topListParams);

        if (checkTopListRows.length < 1) {

            const postTopListRows = await eatDealDao.postTopListBookMark(topListParams);
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "북마크 등록 성공",
            });
        }

        const patchTopListRows = await eatDealDao.patchTopListBookMark(topListParams);

        //북마크 상태 체크
        const checkTopListRows2 = await eatDealDao.checkTopListBookMark(topListParams);

        if (checkTopListRows2[0].status == 1)
            return res.json({
                isSuccess: true,
                code     : 1001,
                message  : "북마크 상태 등록 완료",
            });

        if (checkTopListRows2[0].status == 0)
            return res.json({
                isSuccess: true,
                code     : 1002,
                message  : "북마크 상태 해제 완료",
            });
    } catch (err) {
        logger.error(`App - patchTopList Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};


// TopList 가져오기
exports.getTopListDetail = async function (req, res) {
    const {id} = req.verifiedToken;
    const {limit, page} = req.query;
    const {topListId} = req.params;

    if (!/^([0-9]).{0,5}$/.test(page))
        return res.json({
            isSuccess: false,
            code     : 2000,
            message  : "page는 숫자입니다.😖",
        });

    if (!/^([0-9]).{0,5}$/.test(limit))
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "limit는 숫자입니다.",
        });

    if (!/^([0-9]).{0,100}$/.test(topListId))
        return res.json({
            isSuccess: false,
            code     : 2002,
            message  : "topListId는 숫자입니다.",
        });


    try {

        //toplist check
        const checkTopListRows = await eatDealDao.checkTopList(topListId);

        if (checkTopListRows.length < 1)
            return res.json({
                isSuccess: true,
                code     : 4000,
                message  : "해당 인덱스와 맞는 TopList가 없습니다.",
            });

        //조회 수 +1
        const plusTopListViewRows = await eatDealDao.plusTopListView(topListId);

        const topListParams = [id, topListId]
        //toplist 정보 부분 가져오기
        const getTopListDetailInfoRows = await eatDealDao.getTopListDetailInfo(topListParams);

        const topListParams2 = [id, topListId, Number(page), Number(limit)]
        //toplist 식당 부분 가져오기
        const getTopListDetailRestaurantRows = await eatDealDao.getTopListDetailRestaurant(topListParams2);

        //다른 탑리스트 가져오기
        const getOtherTopListRows = await eatDealDao.getOtherTopList(id);

        if (getTopListDetailInfoRows.length >= 0 && getTopListDetailRestaurantRows.length >= 0 && getOtherTopListRows.length >= 0)
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "조회 성공",
                result   : {
                    info        : getTopListDetailInfoRows,
                    restaurant  : getTopListDetailRestaurantRows,
                    otherTopList: getOtherTopListRows
                }
            });

        return res.json({
            isSuccess: true,
            code     : 3000,
            message  : "에러 발생",
        });
    } catch (err) {
        logger.error(`App - getTopListDetail Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};


