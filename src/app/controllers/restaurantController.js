const { pool } = require("../../../config/database");
const { logger } = require("../../../config/winston");
const request = require("request");
const admin = require('firebase-admin');

const secret_config = require("../../../config/secret");

const restaurantDao = require("../dao/restaurantDao");

//식당 전체조회
exports.getAllRestaurant = async function (req, res) {
  //지역 쿼리스트링으로 받음
  const { locationfilter } = req.query;

  //몇킬로 까지 음식점을 표시할건지 쿼리스트링으로 받음
  distance = req.query.distance;

  //정렬 기준 쿼리스트링으로 받음
  sort = req.query.sort;

  //레스토랑필터 1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점
  restaurantFilter = req.query.restaurantFilter;

  //레스토랑 가격 필터 - 1:만원이하, 2:1만원대 ,3:2만원대 ,4:3만원이상
  restaurantPriceFilter = req.query.restaurantPriceFilter;

  //시작 페이지
  page = req.query.page;

  //페이지를 얼마나 읽을 것인지.
  limit = req.query.limit;

  //유저 위치 정보
  userLatitude = req.query.userLatitude;
  userLongitude = req.query.userLongitude;

  //유저 인덱스
  userId = req.verifiedToken.id;

  //유저 필터, 가고싶다 가봤어요 필터  1=가고싶다 2=가봤어요
  userFilter = req.query.userFilter;

  let location = [];

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
        code: 2001,
        message: "locationfilter는 1, 2, 3 중 하나여야 합니다.",
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

  if (!distance) return res.json({ isSuccess: false, code: 2002, message: "음식점을 표시할 거리를 입력해 주세요" });

  if (!sort) return res.json({ isSuccess: false, code: 2003, message: "정렬기준을 입력해 주세요." });

  if (!(sort == 1 || sort == 2 || sort == 3 || sort == 4))
    return res.json({
      isSuccess: false,
      code: 2004,
      message: "정렬기준은 1 :거리순, 2:평점순, 3:리뷰순, 4:추천순 중 한개이여야 합니다.",
    });

  if (!userId) return res.json({ isSuccess: false, code: 2013, message: "유저id를 입력해 주세요." });

  if (!/^([0-9]).{0,10}$/.test(distance))
    return res.json({
      isSuccess: false,
      code: 2006,
      message: "거리는 숫자로만 입력을 해야합니다.",
    });

  if (!page) return res.json({ isSuccess: false, code: 2009, message: "page를 입력해 주세요." });

  if (!limit) return res.json({ isSuccess: false, code: 2010, message: "limit를 입력해 주세요." });

  if (!/^([0-9]).{0,5}$/.test(page))
    return res.json({
      isSuccess: false,
      code: 2011,
      message: "page는 숫자로만 입력을 해야합니다.",
    });

  if (!/^([0-9]).{0,5}$/.test(limit))
    return res.json({
      isSuccess: false,
      code: 2012,
      message: "limit는 숫자로만 입력을 해야합니다.",
    });

  if (userFilter) {
    if (!/^([0-2]).{0}$/.test(userFilter))
      return res.json({
        isSuccess: false,
        code: 2014,
        message: "userFilter는 1또는 2이여야 합니다.",
      });
  }

  //위치정보를 동의하지 않을 시, 쓰레기값 적용
  if (!userLatitude || !userLongitude) {
    (userLatitude = 0), (userLongitude = 0);
  }

  try {
    //유저 위치 설정
    const setUserLocationParams = [Number(userLatitude), Number(userLongitude)];

    //탑 리스트 조회
    const showRestaurantTopList = await restaurantDao.topListInfo();

    //sort 변수 설정
    const showSetSortInfo = await restaurantDao.setSort(sort);

    //유저 위치 설정
    const showUserLocation = await restaurantDao.setUserLocation(setUserLocationParams);

    //어떠한 필터도 적용되지 않은 경우 (기본값)
    if (!restaurantFilter && !restaurantPriceFilter) {
      const showAllRestaurantInfoParams = [userId, userId, location, distance, Number(page), Number(limit)];

      //유저필터가 가고싶다 인 경우.
      if (userFilter == 1) {
        const showAllRestaurantInfo1 = await restaurantDao.allRestaurantInfoLike(showAllRestaurantInfoParams);
        if (showAllRestaurantInfo1.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo1 },
          });
        }
      }

      //유저필터가 가봤어요 인 경우.
      if (userFilter == 2) {
        const showAllRestaurantInfo2 = await restaurantDao.allRestaurantInfoVisited(showAllRestaurantInfoParams);
        if (showAllRestaurantInfo2.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo2 },
          });
        }
      }

      //유저 위치를 기준으로 쿼리 스트링으로 받은 distance킬로 이하 식당 조회
      const showAllRestaurantInfo3 = await restaurantDao.allRestaurantInfo(showAllRestaurantInfoParams);

      if (showAllRestaurantInfo3.length >= 0 && showRestaurantTopList.length >= 0) {
        return res.json({
          isSuccess: true,
          code: 1000,
          message: "조회성공",
          result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo3 },
        });
      }
    }

    //식당 메뉴 필터만 적용된 경우.
    else if (restaurantFilter && !restaurantPriceFilter) {
      if (!/^([0-8]).{0,20}$/.test(restaurantFilter))
        return res.json({
          isSuccess: false,
          code: 2007,
          message: "1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점, 필터번호를 확인해 주세요.",
        });

      const showAllRestaurantInfoParams = [
        userId,
        userId,
        location,
        restaurantFilter,
        distance,
        Number(page),
        Number(limit),
      ];

      //유저필터가 가고싶다 인 경우.
      if (userFilter == 1) {
        const showAllRestaurantInfo1 = await restaurantDao.allRestaurantInfoByMenuFilterLike(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo1.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo1 },
          });
        }
      }

      //유저필터가 가고싶다 인 경우.
      if (userFilter == 2) {
        const showAllRestaurantInfo2 = await restaurantDao.allRestaurantInfoByMenuFilterVisited(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo2.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo2 },
          });
        }
      }

      const showAllRestaurantInfo3 = await restaurantDao.allRestaurantInfoByMenuFilter(showAllRestaurantInfoParams);

      if (showAllRestaurantInfo3.length >= 0 && showRestaurantTopList.length >= 0) {
        return res.json({
          isSuccess: true,
          code: 1000,
          message: "조회성공",
          result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo3 },
        });
      }
    }

    //식당 가격 필터만 적용된 경우.
    else if (restaurantPriceFilter && !restaurantFilter) {
      if (!/^([0-4]).{0,20}$/.test(restaurantPriceFilter))
        return res.json({
          isSuccess: false,
          code: 2008,
          message: "1:만원이하, 2:만원대 ,3:이만원대 ,4:삼만원 이상, 필터번호를 확인해 주세요.",
        });

      const showAllRestaurantInfoParams = [
        userId,
        userId,
        location,
        restaurantPriceFilter,
        distance,
        Number(page),
        Number(limit),
      ];

      //유저필터가 가고싶다 인 경우.
      if (userFilter == 1) {
        const showAllRestaurantInfo1 = await restaurantDao.allRestaurantInfoByPriceFilterLike(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo1.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo1 },
          });
        }
      }

      //유저필터가 가봤어요 인 경우.
      if (userFilter == 2) {
        const showAllRestaurantInfo2 = await restaurantDao.allRestaurantInfoByPriceFilterVisited(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo2.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo2 },
          });
        }
      }

      const showAllRestaurantInfo3 = await restaurantDao.allRestaurantInfoByPriceFilter(showAllRestaurantInfoParams);

      if (showAllRestaurantInfo3.length >= 0 && showRestaurantTopList.length >= 0) {
        return res.json({
          isSuccess: true,
          code: 1000,
          message: "조회성공",
          result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo3 },
        });
      }
    }

    //식당 가격 필터 + 메뉴필터가 적용된 경우.
    else if (restaurantFilter && restaurantPriceFilter) {
      if (!/^([1-8]).{0,20}$/.test(restaurantFilter))
        return res.json({
          isSuccess: false,
          code: 2007,
          message: "1:한식 2:일식 3:중식 4:양식 5:세계음식 6:뷔페 7:카페 8:주점, 필터번호를 확인해 주세요.",
        });

      if (!/^([0-4]).{0,20}$/.test(restaurantPriceFilter))
        return res.json({
          isSuccess: false,
          code: 2008,
          message: "1:만원이하, 2:만원대 ,3:이만원대 ,4:삼만원 이상, 필터번호를 확인해 주세요.",
        });

      const showAllRestaurantInfoParams = [
        userId,
        userId,
        location,
        restaurantPriceFilter,
        restaurantFilter,
        distance,
        Number(page),
        Number(limit),
      ];

      //유저필터가 가고싶다 인 경우.
      if (userFilter == 1) {
        const showAllRestaurantInfo1 = await restaurantDao.allRestaurantInfoByMenuPriceFilterLike(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo1.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo1 },
          });
        }
      }

      //유저필터가 가봤어요 인 경우.
      if (userFilter == 2) {
        const showAllRestaurantInfo2 = await restaurantDao.allRestaurantInfoByMenuPriceFilterVisited(
          showAllRestaurantInfoParams
        );
        if (showAllRestaurantInfo2.length >= 0 && showRestaurantTopList.length >= 0) {
          return res.json({
            isSuccess: true,
            code: 1000,
            message: "조회성공",
            result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo2 },
          });
        }
      }

      const showAllRestaurantInfo3 = await restaurantDao.allRestaurantInfoByMenuPriceFilter(
        showAllRestaurantInfoParams
      );

      if (showAllRestaurantInfo3.length >= 0 && showRestaurantTopList.length >= 0) {
        return res.json({
          isSuccess: true,
          code: 1000,
          message: "조회성공",
          result: { topList: showRestaurantTopList, restaurant: showAllRestaurantInfo3 },
        });
      }
    }

    return res.json({
      isSuccess: false,
      code: 3000,
      message: "조회실패.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - getAllRestaurant Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

// 식당 등록
exports.enrollRestaurant = async function (req, res) {
  const { restaurantName, restaurantLatitude, restaurantLongitude, restaurantPhoneNumber, restaurantFilter } = req.body;
  const { id } = req.verifiedToken;

  if (!restaurantName) {
    return res.json({
      isSuccess: false,
      code: 2001,
      message: "식당 이름을 입력하세요.",
    });
  }

  if (!restaurantLatitude) {
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "식당 위도를 입력하세요",
    });
  }

  if (!restaurantLongitude) {
    return res.json({
      isSuccess: false,
      code: 2003,
      message: "식당 경도를 입력하세요",
    });
  }

  if (typeof restaurantName !== "string" || restaurantName.length > 100)
    return res.json({
      isSuccess: false,
      code: 2004,
      message: "restaurantName은 100자 이하의 문자열을 입력하세요.",
    });

  if (!/^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,15}/.test(restaurantLatitude))
    return res.json({
      isSuccess: false,
      code: 2005,
      message: "올바른 restaurantLatitude 입력하세요.",
    });

  if (!/^-?(([-+]?)([\d]{1,3})((\.)(\d+))?)/.test(restaurantLongitude))
    return res.json({
      isSuccess: false,
      code: 2006,
      message: "올바른 restaurantLongitude 입력하세요.",
    });

  if (restaurantPhoneNumber) {
    if (!/^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}/.test(restaurantPhoneNumber))
      return res.json({
        isSuccess: false,
        code: 2007,
        message: "restaurantPhoneNumber를 전화번호 형식에 맞게 입력하세요.",
      });
  }

  if (restaurantFilter) {
    if (typeof restaurantFilter !== "number" || !(restaurantFilter >= 1 && restaurantFilter <= 8)) {
      return res.json({
        isSuccess: false,
        code: 2008,
        message: "restaurantFilter는 1에서 8사이의 숫자를 입력하세요.",
      });
    }
  }

  const options = {
    uri: `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${restaurantLongitude}&y=${restaurantLatitude}`,
    method: "GET",
    json: true,
    headers: { Authorization: `KakaoAK ${secret_config.kakao_api_key}` },
  };

  // 좌표를 사용하여 주소 가져오는 kakao API
  function getRestaurantLocation(options) {
    return new Promise((resolve, reject) => {
      request(options, function (err, response, body) {
        if (!err && response.statusCode === 200) {
          if (body.documents[0].address === null) {
            resolve(body.documents[0].road_address.address_name);
          } else {
            resolve(body.documents[0].address.address_name);
          }
        } else {
          reject(err);
        }
      });
    });
  }

  let restaurantLocation = "";
  try {
    await (async () => {
      restaurantLocation = await getRestaurantLocation(options);
    })();
  } catch {
    return res.json({
      isSuccess: false,
      code: 3000,
      message: "주소를 계산할 수 없습니다.",
    });
  }

  try {
    const insertRestaurantParams = [
      restaurantName,
      restaurantLocation,
      restaurantLatitude,
      restaurantLongitude,
      restaurantPhoneNumber,
      restaurantFilter,
      id,
    ];

    const insertRestaurantRows = await restaurantDao.insertRestaurant(insertRestaurantParams);
    if (insertRestaurantRows.length === 0) {
      return res.json({
        isSuccess: false,
        code: 4000,
        message: "식당 등록에 실패했습니다.",
      });
    }

    const getUserDeviceTokenRows = await restaurantDao.getUserDeviceToken(id);

    let message = {
      notification: {
        title: '망고플레이트 알람🥝',
        body:getUserDeviceTokenRows[0].userName + '님이 등록해주신 식당정보 감사합니다😀 망고 플레이트에서 검토를 진행 후 등록여부를 알려드릴께요!🧡',
      },
      data: {
        title: '망고플레이트 알람🥝',
        body:getUserDeviceTokenRows[0].userName + '님이 등록해주신 식당정보 감사합니다😀 망고 플레이트에서 검토를 진행 후 등록여부를 알려드릴께요!🧡',
      },
      token: getUserDeviceTokenRows[0].deviceToken,
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

    return res.json({
      restaurantId: insertRestaurantRows.insertId,
      isSuccess: true,
      code: 1000,
      message: "식당 등록 성공",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - enrollrestaurant Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//유저의 식당 좋아요 표시
exports.likeRestaurant = async function (req, res) {
  const { restaurantId } = req.params;

  userId = req.verifiedToken.id;

  if (!restaurantId) return res.json({ isSuccess: false, code: 2001, message: "찜할 식당 인덱스가 있어야 합니다" });

  if (!/^([0-9]).{0,100}$/.test(restaurantId))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "식당 인덱스는 숫자로만 구성되어야 합니다.",
    });

  if (!userId) return res.json({ isSuccess: false, code: 2003, message: "유저 인덱스가 있어야 합니다" });

  if (!/^([0-9]).{0,100}$/.test(userId))
    return res.json({
      isSuccess: false,
      code: 2004,
      message: "유저 인덱스는 숫자로만 구성되어야 합니다.",
    });

  try {
    const checkRestaurantIndexRows = await restaurantDao.checkRestaurantIndex(restaurantId);

    if (checkRestaurantIndexRows.length < 1)
      return res.json({
        isSuccess: true,
        code: 4001,
        message: "해당 인덱스와 일치하는 식당이 없습니다.",
      });

    const likeRestaurantParams = [restaurantId, userId];

    //이미 좋아요를 한 식당인지 확인
    const [checkRestaurantLikeRows] = await restaurantDao.checkRestaurantLike(likeRestaurantParams);

    //좋아요가 없으면
    if (checkRestaurantLikeRows.length < 1) {
      const postRestaurantLikeRows = await restaurantDao.postRestaurantLike(likeRestaurantParams);

      return res.json({
        isSuccess: true,
        code: 1000,
        message: "좋아요 성공",
      });
    }

    //등록된 상태에서 status값이 1이면 좋아요 해제
    if (checkRestaurantLikeRows[0].status == 1) {
      const changeRestaurantLikeOffRows = await restaurantDao.changeRestaurantLikeOff(likeRestaurantParams);

      return res.json({
        isSuccess: true,
        code: 1001,
        message: "좋아요 해제 성공",
      });
    }

    //등록된 상태에서 status값이 0이면 좋아요 등록
    if (checkRestaurantLikeRows[0].status == 0) {
      const changeRestaurantLikeOnRows = await restaurantDao.changeRestaurantLikeOn(likeRestaurantParams);

      return res.json({
        isSuccess: true,
        code: 1000,
        message: "좋아요 성공",
      });
    }
    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - likeRestaurant Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//식당 상세 정보 조회
exports.restaurantDetail = async function (req, res) {
  const { restaurantId } = req.params;

  userId = req.verifiedToken.id;

  if (!restaurantId) return res.json({ isSuccess: false, code: 2001, message: "식당 인덱스를 입력해 주세요." });

  if (!/^([0-9]).{0,100}$/.test(restaurantId))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "식당 인덱스는 숫자로만 구성되어야 합니다.",
    });

  if (!userId) return res.json({ isSuccess: false, code: 2003, message: "유저 인덱스가 있어야 합니다" });

  if (!/^([0-9]).{0,100}$/.test(userId))
    return res.json({
      isSuccess: false,
      code: 2004,
      message: "유저 인덱스는 숫자로만 구성되어야 합니다.",
    });

  try {
    const restaurantDetailParams = [restaurantId, restaurantId, userId, userId, restaurantId];
    const restaurantReviewDetailParams = [userId, restaurantId];
    const nearRestaurantParams = [userId, userId];

    //식당 체크
    const checkRestaurantRows = await restaurantDao.checkRestaurant(restaurantId);
    if (checkRestaurantRows.length < 1)
      return res.json({
        isSuccess: true,
        code: 4001,
        message: "해당 인덱스와 맞는 식당이 없습니다.",
      });

    //api를 실행 하면 해당 식당의 조회수를 +1 증가
    const plusRestaurantView = await restaurantDao.plusRestaurantView(restaurantId);

    //식당 자세히 보기의 이미지만 가져오기
    const restaurantImgRows = await restaurantDao.getRestaurantImg(restaurantId);

    //식당 상세정보를 가져오기 식당소개 메뉴 등등..
    const restaurantDetailInfoRows = await restaurantDao.getRestaurantDetailInfo(restaurantDetailParams);

    //식당 메뉴이미지를 가져오기
    const restaurantMenuImgRows = await restaurantDao.getRestaurantMenuImg(restaurantId);

    //식당의 리뷰 개수를 가져오기(맛있다,괜찮다,별로 리뷰가 각각 몇개인지, 총 리뷰가 몇개인지)
    const restaurantReviewCountRows = await restaurantDao.getRestaurantReviewCount(restaurantId);

    //식당의 리뷰 상세를 가져오기(리뷰내용 등등...)
    const restaurantReviewRows = await restaurantDao.getRestaurantReview(restaurantReviewDetailParams);

    //식당 리뷰 이미지 가져오기
    //const restaurantReviewImgRows = await restaurantDao.getRestaurantReviewImg(restaurantId);

    //식당 키워드를 가져오기
    const restaurantKeyWordRows = await restaurantDao.getRestaurantKeyWord(restaurantId);

    //식당의 위도경도를 설정(주변식당을 가져오기 위해 사용)
    const setRestaurantLocationRows = await restaurantDao.setRestaurantLocation(restaurantId);

    //현재 식당 기준 주변 가까운 식당을 4개 보여주기
    const getNearRestaurantRows = await restaurantDao.getNearRestaurant(nearRestaurantParams);

    //현재 지역 알려주기
    //const currentAreaRows = await restaurantDao.getCurrentArea();

    //distanceFromArea는 클라 쪽에서 필요없는 값
    //currentAreaRows[0].distanceFromArea = undefined

    //distanceFromRestaurant는 클라 쪽에서 필요없는 값
    for (let i = 0; i < getNearRestaurantRows.length; i++) getNearRestaurantRows[i].distanceFromRestaurant = undefined;

    //리뷰 이미지 부분
    for (let i = 0; i < restaurantReviewRows.length; i++) {
      const restaurantReviewImgRows = await restaurantDao.getRestaurantReviewImg(restaurantReviewRows[i].reviewId);
      restaurantReviewRows[i].reviewImgList = restaurantReviewImgRows;
    }

    //현재 지역 부분
    const currentAreaRows = await restaurantDao.getCurrentArea();

    //현재 지역 부분
    for (let i = 0; i < getNearRestaurantRows.length; i++) {
      getNearRestaurantRows[i].areaName = currentAreaRows[0].areaName;
    }

    if (
      restaurantImgRows.length >= 0 &&
      restaurantDetailInfoRows.length >= 0 &&
      restaurantMenuImgRows.length >= 0 &&
      restaurantReviewCountRows.length >= 0 &&
      restaurantReviewRows.length >= 0 &&
      restaurantKeyWordRows.length >= 0 &&
      getNearRestaurantRows.length >= 0
    ) {
      return res.json({
        isSuccess: true,
        code: 1000,
        message: "조회성공",
        result: {
          imgs: restaurantImgRows,
          detailedInfo: restaurantDetailInfoRows,
          menuImg: restaurantMenuImgRows,
          keyWord: restaurantKeyWordRows,
          reviewCount: restaurantReviewCountRows,
          review: restaurantReviewRows,
          nearRestaurant: getNearRestaurantRows,
        },
      });
    }

    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - restaurantDetail Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//식당 리뷰 사진 자세히 보기
exports.getImagesDetail = async function (req, res) {
  const { imgId } = req.params;

  userId = req.verifiedToken.id;

  if (!imgId) return res.json({ isSuccess: false, code: 2001, message: "이미지 인덱스가 있어야 합니다." });

  //이미지 인덱스 체크
  const checkImagesDetailRows = await restaurantDao.checkImagesDetail(imgId);
  if (checkImagesDetailRows.length < 1)
    return res.json({
      isSuccess: true,
      code: 4001,
      message: "해당 인덱스와 맞는 이미지가 없습니다.",
    });

  if (!/^([0-9]).{0,100}$/.test(imgId))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "이미지 인덱스는 숫자로만 구성되어야 합니다.",
    });

  try {
    const imagesDetailParams = [userId, imgId];
    const imagesDetailRows = await restaurantDao.imagesDetailInfo(imagesDetailParams);

    if (imagesDetailRows.length >= 0) {
      return res.json({
        isSuccess: true,
        code: 1000,
        message: "조회 성공",
        result: imagesDetailRows,
      });
    }
    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - getImagesDetail Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//가봤어요 등록할 정보 보기
exports.visitedInfo = async function (req, res) {
  const { restaurantId } = req.params;

  userId = req.verifiedToken.id;

  if (!restaurantId) return res.json({ isSuccess: false, code: 2001, message: "식당 인덱스를 입력해 주세요." });

  if (!/^([0-9]).{0,100}$/.test(restaurantId))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "식당 인덱스는 숫자로만 구성되어야 합니다.",
    });

  //식당 체크
  const checkRestaurantRows = await restaurantDao.checkRestaurant(restaurantId);
  if (checkRestaurantRows.length < 1)
    return res.json({
      isSuccess: true,
      code: 4001,
      message: "해당 인덱스와 맞는 식당이 없습니다.",
    });

  try {
    const visitedInfoParams = [userId, restaurantId];
    //가봤어요는 하루에 한번만 가능, 가봤어요 했는지 체크
    const checkVisitedRows = await restaurantDao.checkVisited(visitedInfoParams);

    if (checkVisitedRows[0].length > 0)
      return res.json({
        isSuccess: true,
        code: 4002,
        message: "가봤어요는 하루에 한번만 가능합니다!",
      });

    const getVisitedInfoParams = [restaurantId, userId];

    //식당의 위도경도를 설정 지역 가져오기 위해 사용
    const setRestaurantLocationRows = await restaurantDao.setRestaurantLocation(restaurantId);

    //지역 가져오기
    const currentAreaRows = await restaurantDao.getCurrentArea();
    //distanceFromArea는 클라 쪽에서 필요없는 값
    currentAreaRows[0].distanceFromArea = undefined;

    //등록할 방문 정보 가져오기
    const visitedInfoRows = await restaurantDao.getVisitedInfo(getVisitedInfoParams);

    if (currentAreaRows.length >= 0 && visitedInfoRows.length >= 0) {
      return res.json({
        isSuccess: true,
        code: 1000,
        message: "조회 성공",
        result: { area: currentAreaRows, visitedInfo: visitedInfoRows },
      });
    }
    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - visitedInfo Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//가봤어요 등록하기
exports.enrollVisited = async function (req, res) {
  const { restaurantId } = req.params;

  userId = req.verifiedToken.id;

  status = req.query.status;

  if (!restaurantId) return res.json({ isSuccess: false, code: 2001, message: "식당 인덱스를 입력해 주세요." });

  if (!status) return res.json({ isSuccess: false, code: 2003, message: "상태값을 입력해주세요 1:공개 2:나만보기" });

  if (!/^([0-9]).{0,100}$/.test(restaurantId))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "식당 인덱스는 숫자로만 구성되어야 합니다.",
    });

  if (!/^([1-2]).{0}$/.test(status))
    return res.json({
      isSuccess: false,
      code: 2002,
      message: "올바른 상태값을 입력해주세요 1:공개 2:나만보기",
    });

  //식당 체크
  const checkRestaurantRows = await restaurantDao.checkRestaurant(restaurantId);
  if (checkRestaurantRows.length < 1)
    return res.json({
      isSuccess: true,
      code: 4001,
      message: "해당 인덱스와 맞는 식당이 없습니다.",
    });

  try {
    const visitedInfoParams = [userId, restaurantId];
    const visitedInfoParams2 = [restaurantId, userId, status];

    //가봤어요는 하루에 한번만 가능, 가봤어요 했는지 체크
    const checkVisitedRows = await restaurantDao.checkVisited(visitedInfoParams);

    if (checkVisitedRows[0].length > 0)
      return res.json({
        isSuccess: true,
        code: 4002,
        message: "가봤어요는 하루에 한번만 가능합니다!",
      });

    const enrollVistiedRows = await restaurantDao.enrollVistied(visitedInfoParams2);

    if (checkVisitedRows[0].length < 1)
      return res.json({
        isSuccess: true,
        code: 1000,
        message: "가봤어요 등록 성공",
      });

    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - enrollVisited Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};

//식당 검색
exports.searchRestaurant = async function (req, res) {
  const { locationfilter,userLatitude,userLongitude,page,limit } = req.query;
  const { searchWord } = req.body;
  //유저 인덱스
  userId = req.verifiedToken.id;

  let location = [];
  let restaurnatId = [];

  if(!searchWord)
  return res.json({
    isSuccess: false,
    code: 2001,
    message: "검색어를 입력해 주세요.",
  });

  if (typeof searchWord !== "string" || searchWord.length > 10 || searchWord.length < 2) 
    return res.json({
      isSuccess: false,
      code: 2005,
      message: "searchWord는 10자 이하 2자 이상의 문자열입니다.",
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
        code: 2002,
        message: "locationfilter는 1, 2, 3 중 하나여야 합니다.",
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

  if (!/^([0-9]).{0,5}$/.test(page))
    return res.json({
      isSuccess: false,
      code: 2003,
      message: "page는 숫자로만 입력을 해야합니다.",
    });

  if (!/^([0-9]).{0,5}$/.test(limit))
    return res.json({
      isSuccess: false,
      code: 2004,
      message: "limit는 숫자로만 입력을 해야합니다.",
    });

  if((!userLatitude) || (!userLongitude)){
    userLatitude = 0 ;
    userLongitude = 0;
  }

  //검색어로 식당 키워드에서 식당 인덱스 받아오기
  const getIdFromRestaurantKeyWordRows = await restaurantDao.getIdFromRestaurantKeyWord(searchWord);
  for(let i=0; i<getIdFromRestaurantKeyWordRows.length; i++){
    restaurnatId.push(getIdFromRestaurantKeyWordRows[i].restaurantId)
  }
  restaurnatId.push(0)

  //검색어로 식당이름에서 식당 인덱스 받아오기
  const getIdFromRestaurantRows = await restaurantDao.getIdFromRestaurant(searchWord);
  for(let i=0; i<getIdFromRestaurantRows.length; i++){
    restaurnatId.push(getIdFromRestaurantRows[i].restaurantId)
  }

  //유저 위치 설정
  const setUserLocationParams = [Number(userLatitude), Number(userLongitude)];
  //유저 위치 설정
  const setUserLocationRows = await restaurantDao.setUserLocation(setUserLocationParams);

  try {
    const searchWordParams = [userId,userId,location,restaurnatId,Number(page),Number(limit)];
    //식당 가져오기
    const getRestaurantInfoByKeyWordRows = await restaurantDao.getRestaurantInfoByKeyWord(searchWordParams);
    //잇딜 가져오기
    const getEatDealByKeyWordRows =  await restaurantDao.getEatDealByKeyWord(searchWord);

    if (getRestaurantInfoByKeyWordRows.length > 0 && getEatDealByKeyWordRows.length >=0 ) {
      return res.json({
        isSuccess: true,
        code: 1000,
        message: "조회 성공",
        result: {eatDeal : getEatDealByKeyWordRows ,restaurant:getRestaurantInfoByKeyWordRows},
      });
    }

    if (getRestaurantInfoByKeyWordRows.length == 0) {
      return res.json({
        isSuccess: true,
        code: 1001,
        message: "검색어와 관련된 식당이 없습니다. 다른 검색어를 입력해 주세요.",
        result: getRestaurantInfoByKeyWordRows,
      });
    }
    return res.json({
      isSuccess: true,
      code: 3000,
      message: "에러 발생.",
    });
  } catch (err) {
    // await connection.rollback(); // ROLLBACK
    // connection.release();
    logger.error(`App - searchRestaurant Query error\n: ${err.message}`);
    return res.status(500).send(`Error: ${err.message}`);
  }
};