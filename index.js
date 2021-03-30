const express = require("./config/express");
const { logger } = require("./config/winston");

/////////////////////////////pushAlarm/////////////////
const admin = require("firebase-admin");

let serAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serAccount),
});
//////////////////////////////pushAlarm//////////////////

const port = 3000;
express().listen(port);
logger.info(`${process.env.NODE_ENV} - API Server Start At Port ${port}`);
