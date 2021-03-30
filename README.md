# MangoPlate APP Clone Project

## MangoPlate Clone project에 사용된 백엔드 코드 저장소 입니다.

---
## 팀원
* [(Radi) 황상연](https://github.com/WhiteRadish-Hwang) : 프론트엔드 개발
* [(Lake) 황성준](https://github.com/sungjun1116) : 백엔드 개발
* [(Andrew)이유상](https://github.com/liyusang1) : 백엔드 개발
---
## 개발 환경
>AWS EC2에서 Node를 통해 서버를 구동하고 AWS RDS를 사용.

<img src="https://firebasestorage.googleapis.com/v0/b/mangoplate-a1a46.appspot.com/o/nginx.png?alt=media&token=838f77d3-a729-4a81-b1ad-8befaf55d429" width="250" height="100"> <img src="https://miro.medium.com/max/960/0*uXXbbKGKNQUQonbC.png" width="230" height="100">

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/1200px-Amazon_Web_Services_Logo.svg.png" width="200" height="100"><img src="https://img1.daumcdn.net/thumb/R800x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdn%2FbnveOL%2FbtqKylNzdtm%2FN9aaEvOxd7Hm0N0KJYg6l0%2Fimg.png" width="170" height="100"><img src="https://media.vlpt.us/images/ayoung0073/post/e736dc61-9be5-4f91-b751-4a1f64bc4a97/rds.png" width="170" height="100"><img src="https://media.vlpt.us/images/leejh3224/post/eeea9dd5-d99a-4b7b-9024-d4866d48ca70/mysql.png" width="200" height="100">


<img src="https://firebasestorage.googleapis.com/v0/b/mangoplate-a1a46.appspot.com/o/android%2010.png?alt=media&token=b46b3b81-a75e-4718-ba0c-f4c2e021f67c" width="130" height="100"><img src="https://firebasestorage.googleapis.com/v0/b/mangoplate-a1a46.appspot.com/o/1_oNM0JVqivoi3lVPF6ygp9Q.png?alt=media&token=016ecf7d-c87b-41ac-aff2-74f7b129417e" width="200" height="100">


---

```text
소프트스퀘어드 노드 템플릿은 Node, Express Framwork, MVC (Route, Controller)으로 구성되어있고,
데이터베이스 모듈(= 라이브러리)는 mysql2 을 사용하여 DB와 통신하고있다. 설정파일은 /config/database.js 에 있다.

그리고 winston 이라는 모듈와 winston-daily-rotate-file 이라는 모듈 사용하여 Logger (=/config/winston.js) 를 구축해놓았다.
Firebase나 토큰이나 누군가에게 공개해선 안되는 키값들은 /config/secret.js 라는 곳에 모아놓고있다.

jwt 는 /config/jwtMiddleware.js 에서 검증을 jwtMiddleware 라는 자체모듈로 만들어서 사용하고있다. 이거는 route 파일에서 체이닝 방식으로 사용하고있다. (예제는 /app/routes/* 에 있는 파일을 참고하면 된다.)

express 는 /config/express.js 에 설정 값들이 모여있다. 
기본 설정들은 해놓았는데 필요한 설정이 있다면 이 파일로 가서 추가/수정/삭제를 하면 된다.
```

---
## 프로젝트 기간

```
2021-02-03 ~ 2021-02-17
```

---
## ERD 설계도
> AQueryTool 이용

<img src="https://firebasestorage.googleapis.com/v0/b/mangoplate-a1a46.appspot.com/o/%EB%A7%9D%EA%B3%A0%ED%94%8C%EB%A0%88%EC%9D%B4%ED%8A%B8_20210316_31_45.png?alt=media&token=8c48c75a-74a0-4113-92d6-fcfa10e22be9">

## API Sheet

>https://docs.google.com/spreadsheets/d/17y8Ly1hpqzqV-CuqsH1wEuEXZfPlo-qTFa1UVrqtv7Y/edit?usp=sharing


## 시연 영상
> https://www.youtube.com/watch?v=17xm5eXG_XQ&feature=youtu.be
---
# 실행 화면


### 로그인

<img src=image/5.jpg width="260" height="500">  

---

### 음식점 찾기

<img src=image/6.jpg width="260" height="500"> <img src=image/7.jpg width="260" height="500">

---

### 음식점 상세조회


<img src=image/n3.jpg width="260" height="500"> <img src=image/n2.jpg width="260" height="500"> <img src=image/n1.jpg width="260" height="500"> <img src=image/17.jpg width="260" height="500">

---
### 소식

<img src=image/1.jpg width="260" height="500"> <img src=image/3.jpg width="260" height="500">

---

### EAT DEAL

<img src=image/18.jpg width="260" height="500"> <img src=image/19.jpg width="260" height="500"> <img src=image/t1.jpg width="260" height="500">

---

### 식당 등록

<img src=image/14.jpg width="260" height="500"> <img src=image/15.jpg width="260" height="500">

---

### TOP List

<img src=image/16.jpg width="260" height="500">

---

### 내 정보

<img src=image/2.jpg width="260" height="500"> <img src=image/img.png width="260" height="500">

---

## License

본 템플릿은 소프트스퀘어드에 소유권이 있으며 본 자료에 대한 상업적 이용 및 무단 복제,배포 및 변경을 원칙적으로 금지하며 이를 위반할 때에는 형사처벌을 받을 수 있습니다.