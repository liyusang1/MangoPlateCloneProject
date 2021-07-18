const {pool} = require("../../../config/database");
const {logger} = require("../../../config/winston");

const userDao = require("../dao/userDao");
const {constants} = require("buffer");

// 사용자 정보 조회
exports.getProfile = async function (req, res) {
    const {userId} = req.params;
    try {
        const selectUserInfoRows = await userDao.selectUserInfo(userId);

        if (selectUserInfoRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 4000,
                message  : "등록된 정보가 없습니다.",
            });
        }
        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "내정보 조회 성공",
            result   : selectUserInfoRows,
        });
    } catch (err) {
        logger.error(`App - getProfile Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 내정보 수정
exports.updateProfile = async function (req, res) {
    const {id} = req.verifiedToken;
    const {userId} = req.params;
    const {userinfofilter} = req.query;
    const {userName, userProfileImgUrl, userEmail, userPhoneNumber} = req.body;

    if (id != userId) {
        return res.json({
            isSucess: false,
            code    : 2005,
            message : "권한이 없습니다.",
        });
    }

    let userData = ``;
    if (userinfofilter === "1") {
        userData = userName;
        if (typeof userData !== "string" || !(userData.length >= 2 && userData.length <= 20)) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "userData는 2-20자의 문자열입니다.",
            });
        }
    } else if (userinfofilter === "2") {
        userData = userProfileImgUrl;
        if (
            typeof userData !== "string" ||
            !/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(userData)
        ) {
            return res.json({
                isSuccess: false,
                code     : 2001,
                message  : "userProfileImgUrl 을 Url형식에 맞게 입력해주세요.",
            });
        }
    } else if (userinfofilter === "3") {
        userData = userEmail;
        if (!/^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/.test(userEmail)) {
            return res.json({
                isSuccess: false,
                code     : 2002,
                message  : "userEmail을 이메일 형식에 맞게 입력하세요.",
            });
        }
    } else if (userinfofilter === "4") {
        userData = userPhoneNumber;
        if (!/^\d{3}-\d{3,4}-\d{4}$/.test(userPhoneNumber)) {
            return res.json({
                isSuccess: false,
                code     : 2003,
                message  : "userPhoneNumber를 휴대전화 번호 형식에 맞게 입력하세요.",
            });
        }
    } else if (userinfofilter !== 0) {
        return res.json({
            isSuccess: false,
            code     : 2004,
            message  : "userInfoFilter는 1:이름, 2:이메일, 3:전화번호 중 하나로 입력하세요.",
        });
    }

    try {
        switch (userinfofilter) {
            case "1":
                const updateUserNameRows = await userDao.updateUserName(userId, userData);
                return res.json({
                    isSuccess: true,
                    code     : 1000,
                    message  : "userName 수정 성공",
                });
            case "2":
                const updateUserProfileImgUrlRows = await userDao.updateUserProfileImgUrl(userId, userData);
                return res.json({
                    isSuccess: true,
                    code     : 1001,
                    message  : "userProfileImgUrl 수정 성공",
                });
            case "3":
                const updateUserEmailRows = await userDao.updateUserEmail(userId, userData);
                return res.json({
                    isSuccess: true,
                    code     : 1002,
                    message  : "userEmail 수정 성공",
                });
            case "4":
                const updateUserPhoneNumberRows = await userDao.updateUserPhoneNumber(userId, userData);
                return res.json({
                    isSuccess: true,
                    code     : 1003,
                    message  : "userPhoneNumber 수정 성공",
                });
        }
        return res.json({
            isSuccess: false,
            code     : 4000,
            message  : "내정보 수정 실패",
        });
    } catch (err) {
        logger.error(`App - updateProfile Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 팔로워 목록 조회
exports.getfollwer = async function (req, res) {
    const {userId} = req.params;
    try {
        const selectUserInfoRows = await userDao.selectUserInfo(userId);
        if (selectUserInfoRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "userId에 존재하는 정보가 없습니다.",
            });
        }
        const selectFollowerRows = await userDao.selectFollower(userId);

        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "팔로워목록 조회 성공",
            result   : selectFollowerRows,
        });
    } catch (err) {
        logger.error(`App - getfollwer Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 팔로잉 목록 조회
exports.getfollwing = async function (req, res) {
    const {userId} = req.params;
    try {
        const selectUserInfoRows = await userDao.selectUserInfo(userId);
        if (selectUserInfoRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "userId에 존재하는 정보가 없습니다.",
            });
        }

        const selectFollingRows = await userDao.selectFollowing(userId);
        return res.json({
            isSuccess: true,
            code     : 1000,
            message  : "팔로잉목록 조회 성공",
            result   : selectFollingRows,
        });
    } catch (err) {
        logger.error(`App - getfollwing Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

//팔로잉 상태 변경
exports.patchfollwing = async function (req, res) {
    const {id} = req.verifiedToken;
    const {userId} = req.params;

    if (!/^([0-9]).{0,50}$/.test(userId))
        return res.json({
            isSuccess: false,
            code     : 2001,
            message  : "userId는 숫자입니다.",
        });

    if (id == userId)
        return res.json({
            isSuccess: false,
            code     : 2002,
            message  : "자기 자신을 팔로우 할 수 없습니다.",
        });

    try {
        //유저 인덱스 확인
        const checkUserIndexRows = await userDao.checkUserIndex(userId);
        if (checkUserIndexRows.length === 0) {
            return res.json({
                isSuccess: false,
                code     : 2000,
                message  : "해당 인덱스와 맞는 정보가 없습니다.",
            });
        }

        const followingParams = [id, userId];

        //following check
        const checkFollowingRows = await userDao.checkFollowing(followingParams);

        if (checkFollowingRows.length < 1) {
            const postFollowingRows = await userDao.postFollowing(followingParams);
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "팔로잉 등록 성공",
            });
        }

        const patchFollowingRows = await userDao.patchFollowing(followingParams);

        if (checkFollowingRows[0].status == 0)
            return res.json({
                isSuccess: true,
                code     : 1001,
                message  : "팔로잉 상태 등록 완료",
            });

        if (checkFollowingRows[0].status == 1)
            return res.json({
                isSuccess: true,
                code     : 1002,
                message  : "팔로잉 상태 해제 완료",
            });
    } catch (err) {
        logger.error(`App - patchfollwing Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};

// 회원탈퇴
exports.withdrawal = async function (req, res) {
    const {id} = req.verifiedToken;
    const {userId} = req.params;

    if (id !== Number(userId)) {
        return res.json({
            isSuccess: true,
            code     : 2000,
            message  : "권한이 없습니다.",
        });
    }
    try {
        const deleteUserRows = await userDao.deleteUser(userId);
        if (deleteUserRows.affectedRows > 0) {
            return res.json({
                isSuccess: true,
                code     : 1000,
                message  : "회원탈퇴 성공",
            });
        }
        return res.json({
            isSuccess: true,
            code     : 4000,
            message  : "회원탈퇴 실패",
        });
    } catch (err) {
        logger.error(`App - withdrawal Query error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};
