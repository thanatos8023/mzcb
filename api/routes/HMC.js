var express = require('express');
var router = express.Router();
var request = require('request');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var fs = require('fs');
var util = require('util');
var dateUtils = require("date-utils");
var oracledb = require("oracledb");
var dbConfig = require("./dbConfig.js");
oracledb.autoCommit = true;

var connection;
// 오라클 접속
oracledb.getConnection({
  user            : dbConfig.user,
  password        : dbConfig.password,
  connectString   : dbConfig.connectString
}, function (err, con) {
  if (err) {
    console.log ("Oracle DB connection Error!!", err);
  } else {
    console.log ("Oracle DB connection sucessed");  
  }
  connection = con;
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  next();
});

function get_intention(object, callback) {
  console.log("get intention function start")

  request({
    url:'http://192.168.123.31:5050/nlu', 
    qs:{sent:object.content}
  }, function(error, nluResponse, body) {
    if (error) {
      console.error("Language Model Server error");
      return callback(error)
    } 
    // LM이 주는 결과값은 response.body로 나오거든
    var intention = nluResponse.body;

    if (intention.indexOf("FAQ") == -1 || intention == null) {
      intention = "Fail"
    }

    console.log("Output Result of Model: " + intention);
    callback(null, intention);
  });
}

function stringframe(str) {
  return str.replace(/\s/g, "")
}

router.post('/message', function (req, res, next) {
  //console.log("\n\n\n\n\n");
  //console.log(req);
  console.log("SERVER :: API SERVER :: Check the request body");
  console.log(req.body);

  const object = {
    user_key: req.body.user_key, //메세지를 발송한 user을 식별할 수 있는 key
    type: req.body.type,      //user가 보낸 메세지 형태, text, photo 로 이루어짐
    content: req.body.content //user가 보낸 메세지 내용
  };

  get_intention(object, function(err, intention) {
    console.log("user command : " + object.content);
    console.log("user intention: " + intention);

    //var resSQL = "select * from MZCB_RESPONSE where INTENTION = :inte"
    var resSQL = "select * from SEOULCB_RESPONSE where INTENTION = :inte"
    connection.execute(resSQL, {inte: intention}, function (resError, resResult, body) {
      if (resError) {
        //console.error("SERVER :: DB ERROR :: MZCB_RESPONSE connection error");
        console.error("SERVER :: DB ERROR :: SEOULCB_RESPONSE connection error");
        console.error(resError);
        res.end();
        return resError
      }

      console.log(resResult.rows[0]);

      res.json({
        "type": "simpleText",
        "text": resResult.rows[0],
        "object1": null,
        "object2": null,
      });
    });
  });
});

module.exports = router;
