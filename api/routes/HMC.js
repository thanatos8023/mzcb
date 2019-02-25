var express = require('express');
var router = express.Router();
var request = require('request');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var uuid = require('uuid');
var fs = require('fs');
var util = require('util');
var dateUtils = require("date-utils");

/***************************************************
데이터베이스 연결 초기화 후 테스트 연결 수행
데이터베이스 설정파일은 /db 의 db_con.js, db_info.js
***************************************************/
var mysql_dbc = require('../db/db_con')();
var connection = mysql_dbc.init();
mysql_dbc.test_open(connection);

/***************************************************
회원가입 시 현대 Server API 에서 호출 할 라우터

추후 else로 회원이 DB에 존재할 때 해줄 작업을 추가

렌더링 해줄 페이지 경고창 추가!
***************************************************/
var io = require('socket.io')(2231);
router.io = io;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  next();
});

/***************************************************
서버 실행 후 로그 출력 클라이언트와 소켓연결을 위한 대기 코드
연결 시 SERVER_LOG 라는 이벤트 명으로 로그 전송
***************************************************/
io.on('connection', function (socket) {
  console.log('user connected : ', socket.id);
  io.emit('SERVER_LOG', "Hello! you connected success to HMC_Chatbot Server");

  //joined라는 이벤트 명으로 메세지 도착 시 io.emit으로 전체 메시지 전송
  /*socket.on('joined', function(data){
    console.log(data);
    //socket.send("success");
    io.emit('SERVER MESSAGE', "Server Send Response Message");
  });*/
});

function get_temperature(utterance) {
  // 발화에서 온도를 추출하는 함수
  // 우선 발화에서 최고, 적정, 최소 등을 찾는다.
  if (utterance.indexOf("최고") >= 0 || utterance.indexOf("최대") >= 0) {
    // 최고 온도 32 도
    var temperature = '32';
  } else if (utterance.indexOf("최소") >= 0 || utterance.indexOf("최저") >= 0) {
    // 최저 온도 16 도 
    var temperature = '16';
  } else if (utterance.indexOf("적당") >= 0 || utterance.indexOf("적절") >= 0 || utterance.indexOf("적정") >= 0 || utterance.indexOf("아무") >= 0) {
    // 정적 온도 23도 
    var temperature = '25';
  } else if (utterance.indexOf("따뜻") >= 0 || utterance.indexOf("따땃") >= 0) {
    // 따뜻한 온도 27도
    var temperature = '27';
  } else if (utterance.indexOf("시원") >= 0) {
    // 시원한 온도 20도 
    var temperature = '20';
  } else {
    // 직접 온도를 입력한 경우
    var onlyNum = utterance.replace(/[^0-9]/gi, "");
    var temperature = parseInt(onlyNum);
    // 온도 범위 확인 
    if (isNaN(temperature)) {
      // 온도 없음 
      return "-1";
    } else if (temperature < 16 || temperature > 32) {
      // 범위 벗어남
      return "-237";
    } else {
      temperature = temperature.toString();
    }
  }

  return temperature
}

function get_intention(object, callback) {
  console.log("get intention function start")

  var input_command = stringframe(object.content);

  // PIN 먼저 탐색
  var pin = input_command.replace(/[^0-9]/g, "");
  if (pin.length == 4) {
    callback(null, "PIN");
  } else {
    // PIN 이 아닐 경우
    // Food 나 Tour 목록에 포함 여부를 먼저 조사 


    // 우선 모델에 입력
    // 모델은 코퍼스 탐색과 규칙 탐색을 모두 실시함
    request({
      url:'http://192.168.123.237:5050/nlu', 
      qs:{sent:object.content}
    }, function(error, nluResponse, body) {
      if (error) {
        console.error("Language Model Server error");
        return callback(error)
      } 
      // LM이 주는 결과값은 response.body로 나오거든
      var intention = nluResponse.body;
      if (intention == "Fail") {
        // 탐색이 실패했을 경우, Fail 로 반환됨
        // 맛집인가를 확인해야함
        var sql = 'SELECT * FROM `tb_food_list` WHERE `name` = ?'
        connection.query(sql, object.content, function(err, foodResult, body) {
          if (err) {
            console.error("TB_FOOD_LIST connection error");
            callback(err);
          }
          console.log(foodResult);
          if (foodResult.length == 0) {
            // 맛집이 아니면 여행지 검색
            var sql = 'SELECT * FROM `tb_tour_list` WHERE `name` = ?'
            connection.query(sql, object.content, function(err, tourResult, body) {
              if (err) {
                console.error("TB_TOUR_LIST connection error");
                callback(err);
              }

              if (tourResult.length == 0) {
                // 여행지도 아니면 그냥 없는 거
                callback(null, "Fail")
              } else {
                callback(null, "Location")
              }
            });
          } else {
            callback(null, "Food");
          }
        });
      } else {
        console.log("Output Result of Model: " + intention);
        callback(null, intention);
      }
    });
  }
}

function stringframe(str) {
  return str.replace(/\s/g, "")
}

function headersForm(access_token) {
  var headers = {
    'Authorization': "Bearer " + access_token,
    'Content-Type': 'application/json'
  }

  return headers
}

function engineStartForm(pin, msgId, temp) {
  form = {
    "action": "start",
    "pin": pin,
    "temp": temp,
    "msgId": msgId
  }
  return form
}

function engineStopForm(pin, msgId) {
  form = {
    "action": "stop",
    "pin": pin,
    "msgId": msgId
  }
  return form
}

function closeDoorForm(pin, msgId) {
  form = {
    "action": "close",
    "pin": pin,
    "msgId": msgId
  }
  return form
}

function emergencyFlashingHornForm(pin, msgId) { //비상등 제어와 경고음 제어에서 같이 사용
  form = {
    "pin": pin,
    "msgId": msgId
  }
  return form
}

function chargeOnForm(pin, msgId) {
  form = {
    "action": "start",
    "pin": pin,
    "msgId": msgId
  }
  return form
}

function chargeOffForm(pin, msgId) {
  form = {
    "action": "stop",
    "pin": pin,
    "msgId": msgId
  }
  return form
}

function commandURL(command, vehicleId) {
  var str = 'https://stg.kr-ccapi.hyundai.com/api/v1/vehicles/' + vehicleId;

  if (command == "Control_Engine_Start" || command == "Control_Engine_Stop") {
    str = str + '/control/engine'
  } else if (command == "Control_Door_Close") {
    str = str + '/control/door'
  } else if (command == "Control_Light_On") {
    str = str + '/control/light'
  } else if (command == "Control_Horn_On") {
    str = str + '/control/horn'
  } else if (command == "Control_Charge_Start" || command == "Control_Charge_Stop") {
    str = str + '/control/charge'
  }
  return str;
}

/***************************************************
회원가입 후 getControlToken 라우터 사용 시
Pin번호 입력 창의 Pin들을 무작위로 섞기 위한 함수.
추후 추가 및 수정 작성 예정
***************************************************/
function shuffle(a) {
  var j, x, i;
  for (i = a.length; i; i -= 1) {
    j = Math.floor(Math.random() * i);
    x = a[i - 1];
    a[i - 1] = a[j];
    a[j] = x;
  }
}

/***************************************************
ControlToken 획득 및 Pin 설정을 위한 코드
추후 작성 예정, 현재 현대 API Server 오류로 인해
작업 중지.
***************************************************/
router.post('/setPin/getControlToken', function (req, res, next) {
  var state = req.body.state; //메세지를 발송한 user을 식별할 수 있는 key
  var pin = req.body.pin;      //user가 현대 블루링크 인증을 위한 pin
  var code = req.body.code; //AccessToken

  console.log("state : " + state);
  console.log("pin : " + pin);
  console.log("code : " + code);

  var headers = {
    //'Authorization': 'Beare ' + code,
    'Authorization': code,
    //'Authorization' : "Basic MDNmMjUxYjQtNzVjYS00MDQyLWJiYzEtYzgzNzVhNzY3YTgyOnRVdDZrOTI4NWM4RzdxM0xqa0pZQ2tCTFQyRzdhNnFQdTcwUzVmT3ZWand2ZWo0ZA==",
    'Content-Type': 'application/json'
  }

  var form = { 'pin': pin }

  formData = JSON.stringify(form);

  var options = {
    'url': 'http://bluelink.connected-car.io/api/v1/user/pin',
    'method': 'PUT',
    'headers': headers,
    //'form': form
    'body': formData
  }

  request(options, function (err, response, body) {
    //var obj = JSON.parse(body);
    //var errCode = obj.errCode;
    console.log(body);
    /*
    if (errCode == 4002) {
      console.log("failure");
      res.send({ result: "failure" });
    }
    //var obj = JSON.parse(body);
    //var access_token = obj.control_token;

    //console.log(control_token);

    else {
      console.log("success");
      res.send({ result: "success" });
    }*/
  }) //현재 controlToken이 정상적으로 발급되지 않아 작업불가능, 추후 controlToken이 정상 발급 되면 pin과 controlToken DB 입력 작업 수행
});

router.get('/keyboard', function (req, res, next) {
  var answer = {
    "type": "buttons",
    "buttons": ['시작하기']
  };
  res.send(answer);
});

router.get('/insertPin', function (req, res, next) {
  var num_arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  shuffle(num_arr);

  var state = req.query.state; //kakao_id(encrypt code)

  res.render('insertPin', {
    title: "insert your pin",
    length: 5,
    num_arr: num_arr,
    state: state
  })
});

router.get('/conversationDB', function (req, res, next) {
  var stmt = 'select * from `TB_CONVERSATION`';
  connection.query(stmt, function (err, result) {
    res.render('conversationDB', {
      title: "conversationDB",
      result: result
    })
  });
});

router.post('/confirmPin', function (req, res, netx) {
  var state = req.body.state; //메세지를 발송한 user을 식별할 수 있는 key
  var pin = req.body.pin;      //user가 현대 블루링크 인증을 위한 pin
  var access_token;

  var uuid_state = state + "&" + uuid.v1();
  console.log("uuid_state : " + uuid_state)

  console.log("state : " + state);
  console.log("pin : " + pin);

  var stmt = 'select * from `TB_USER_INFO` where `user_id` = ?';
  connection.query(stmt, state, function (err, result) {
    if (err) {
      return err;
    } else {
      if (result.length === 0) { //카카오 사용자 정보가 DB에 존재하지 않음. 회원가입 후 수행하라는 메시지 띄우기
        console.log("SERVER :: Not User : " + state);

        var responseData = {
          status: 4010,
          message: 'Not User'
        }
        res.end(JSON.stringify(responseData));
      } else if (result[0].pin == pin) { //사용자 DB에 존재하는 Pin값이 사용자가 입력한 핀값과 맞을 시
        console.log("SERVER :: Pin Correct : " + pin);
        access_token = result[0].access_token;
        var stmt = 'select * from `TB_COMMAND` where `user_id` = ?';
        connection.query(stmt, state, function (err, result) {
          if (err) {
            return err;
          } else if (result.length === 0) {
            console.log("SERVER :: Pin Correct : NO COMMAND: " + pin);
            var responseData = {
              status: 500,
              message: 'No queued commands'
            }
            res.end(JSON.stringify(responseData));
            //이전 명령 수행 중. 코드가 8000일 때는 작업 수행중이라 다른 작업을 내리거나 삭제 불가
          } else if (result[0].status == "8000") {
            console.log("SERVER :: Pin Correct : Waiting Other response: " + pin);
            var responseData = {
              status: 8000,
              message: result[0].control_command
            }
            res.end(JSON.stringify(responseData));
          } else {
            console.log("SERVER :: Pin Correct : Request to HMC: " + pin);
            console.log("access_teken : " + access_token);
            var headers = headersForm(access_token);
            var form;

            if (result[0].control_command == "Engine Start") {
              form = engineStartForm(pin, uuid_state, result[0].temp);
              //form = engineStartForm(pin, state, result[0].temp);
            } else if (result[0].control_command == "Engine Stop") {
              form = engineStopForm(pin, uuid_state);
              //form = engineStopForm(pin, state);
            } else if (result[0].control_command == "Close Door") {
              form = closeDoorForm(pin, uuid_state);
              //form = closeDoorForm(pin, state);
            } else if (result[0].control_command == "Light Control" || result[0].control_command == "Horn Control") {
              form = emergencyFlashingHornForm(pin, uuid_state);
              //form = emergencyFlashingHornForm(pin, state);
            } else if (result[0].control_command == "Charge On Control") {
              form = chargeOnForm(pin, uuid_state);
              //form = chargeOnForm(pin, state);
            } else if (result[0].control_command == "Charge Off Control") {
              form = chargeOffForm(pin, uuid_state);
              //form = chargeOffForm(pin, state);
            }

            formData = JSON.stringify(form);
            //Post 요청을 위해 데이터를 JSON 형식으로 변환하여 body에 포함

            var options = {
              'url': commandURL(result[0].control_command, result[0].vehicleId),
              'method': 'POST',
              'headers': headers,
              'body': formData,
            }

            console.log("SERVER :: options :");
            console.log(options);

            // Start the request
            request(options, function (error, response, body) {
              if (err) {
                console.log("SERVER :: Request for HMC server ERROR!");
                console.log(err)
                return err
              }
              else {
                console.log("SERVER :: Requesting for HMC");
                var obj = JSON.parse(body);

                if (obj.errMsg) {
                  /***************************************************
                  현대 API Server로 이미 명령을 전송 한 상태일 때
                  한번 더 명령 수행 요청 시 API 서버에서 명령 수행 중 or 
                  명령 중복 Message를 전송할 때 걸리는 조건.
                  ***************************************************/
                  console.log("SERVER :: " + result[0].control_command + " Command waiting : " + result[0].vehicleId);

                  var responseData = {
                    status: 4004,
                    message: result[0].control_command
                  }
                  res.end(JSON.stringify(responseData));
                } else {
                  /***************************************************
                  챗봇 서버에서 현대 API Server로 명령 전달 후
                  수행 결과 도착 시 챗봇 서버와 소켓 연결 된
                  로그 클라이언트로 로그 내용 전송
                  ***************************************************/

                  console.log("SERVER :: Pin Correct : HMC Response correct: " + pin);

                  router.io.emit('SERVER_LOG', {
                    'classification': 'Request',
                    'command': result[0].control_command,
                    'result': 'wait',
                    'user': state,
                    'vehicleId': result[0].vehicleId
                  });

                  var control_command = result[0].control_command;
                  var stmt = 'update `TB_COMMAND` set  `status` = ? where `user_id` = ?';
                  connection.query(stmt, ["8000", state], function (err, result) {
                    if (err) {
                      console.log("SERVER :: 8000");
                      return err
                    }
                    var responseData = {
                      status: 200,
                      message: control_command
                    }
                    res.end(JSON.stringify(responseData));
                  });
                }
              }
            });
          }
        });
        /*var responseData = {
          status  : 200,
          success : 'Updated Successfully'
        }
        res.end(JSON.stringify(responseData));*/
      } else { //사용자 DB에 조재하는 Pin값이 사용자가 입력한 핀값과 일치하지 않는 경우
        var responseData = {
          status: 4003,
          success: 'invailed Pin'
        }
        res.end(JSON.stringify(responseData));
      }
    }
  });
});

/***************************************************
회원가입 시 현대 Server API 에서 호출 할 라우터

추후 else로 회원이 DB에 존재할 때 해줄 작업을 추가

경고창 출력 시켜줄 페이지 렌더링 코드 추가!
***************************************************/
router.get('/oauth2url', function (req, res, next) {
  var code = req.query.code; //authorize_code
  var state = req.query.state; //kakao_id(encrypt code)
  state = state.replace('<', '');
  state = state.replace('>', '');
  //http://bluelink.connected-car.io/api/v1/user/oauth2/authorize?client_id=03f251b4-75ca-4042-bbc1-c8375a767a82&redirect_uri=http://58.225.115.230:23701/hmc/oauth2url&response_type=code&state=TVbOd1iDgZ-x
  var Authorization = "03f251b4-75ca-4042-bbc1-c8375a767a82:tUt6k9285c8G7q3LjkJYCkBLT2G7a6qPu70S5fOvVjwvej4d"; //Client ID:Client Secret
  var buffer = new Buffer(Authorization);
  var base64Authorization = buffer.toString('base64'); //Client ID : Client Secret 값을 Base 64로 인코딩

  var headers = {
    'Authorization': "Basic " + base64Authorization,
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  var form = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': 'http://58.225.115.230:23701/hmc/oauth2url'
  }

  formData = querystring.stringify(form);
  console.log(formData);

  var options = {
    'url': 'https://stg.kr-ccapi.hyundai.com/api/v1/user/oauth2/token',
    'method': 'POST',
    'headers': headers,
    //'form':form
    'body': formData
  }

  request(options, function (err, response, body) {
    var obj = JSON.parse(body);
    var access_token = obj.access_token;
    var refresh_token = obj.refresh_token;
    var token_type = obj.token_type;

    var stmt = 'insert into `TB_COMMAND` set `user_id` = ?'; //TB_ETC_COMMAND에 데이터를 한번 넣어놓고 추후 DELTE->INSERT 구문을 UPDATE로 변경하기 위해 입력
    connection.query(stmt, state, function (err, result) {
      var stmt = 'select * from `TB_USER_INFO` where `user_id` = ?';
      connection.query(stmt, state, function (err, result) {
        if (err) {
          return err;
        } else if (result.length === 0) { //카카오 사용자 정보가 데이터베이스에 존재하지 않으면 호출
          console.log("SERVER :: New Join " + state);

          var getVehicleHeaders = {
            'Authorization': access_token,
            'Content-Type': 'application/x-www-form-urlencoded'
          }

          // Configure the request
          var getVehicleOptions = {
            url: 'https://stg.kr-ccapi.hyundai.com/api/v1/vehicles',
            method: 'GET',
            headers: getVehicleHeaders
          }

          // Start the request
          request(getVehicleOptions, function (error, response, body) {
            // Print out the response body
            var obj = JSON.parse(body);
            var vehicleId = obj.vehicles[0].vehicleId;
            var type = obj.vehicles[0].type;

            var stmt = 'insert into `TB_USER_INFO` set `user_id` = ?, `authorization` = ?, `access_token` =?, `refresh_token` = ?, `token_type` = ?, `vehicleId` = ?, `pin` = ?, `vehicleType` = ?';
            connection.query(stmt, [state, code, access_token, refresh_token, token_type, vehicleId, '1234', type], function (err, result) {
              var num_arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
              shuffle(num_arr)

              res.render('index', {
                title: "MY HOMEPAGE",
                length: 5,
                num_arr: num_arr,
                state: state,
                code: access_token
              })
            })
          });
        }
      });
    });
  })
});

/***************************************************
시동, 공조, 도어, 깜박이, 크락션 등 기능 수행 후 
기능 수행결과 확인을 위해 따로 작성하는 controlcallbackurl

카카오 플러스 친구의 제어결과 확인에서 실시간으로 
전송받은 결과 확인이 가능

router.io.emit 명령어를 통해 명령 수행 결과 로그를
소켓에 연결 된 로그 확인 클라이언트들로 전송
***************************************************/
router.post('/controlcallbackurl', function (req, res, next) {
  var resultMsg = req.body.resultMsg;
  var resultCode = req.body.resultCode;
  var msgId = req.body.msgId;
  var strArr = msgId.split('&');

  var stmt = 'update `TB_COMMAND` set  `control_command` = ?, `status` = ?, `temp` = ? where `user_id` = ?';
  connection.query(stmt, [null, resultCode, null, strArr[0]], function (err, result) {
    var date = new Date();
    console.log(date.toFormat('YYYY-MM-DD HH24:MI:SS'));
    console.log("SERVER :: Request controlcallback! :: vehicle status change");
    console.log("msgId : " + msgId + " resultCode : " + resultCode + " resultMsg : " + resultMsg);

    res.sendStatus(200);
    res.end();
  });
});


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
    var userSQL = 'select * from `TB_USER_INFO` where `user_id` = ?';
    connection.query(userSQL, object.user_key, function (userErr, userResult) {
      if (userErr) {
        console.error("SERVER :: DB ERROR :: tb_user_info connection error");
        console.error(userErr);
        res.end();
        return userErr
      } 

      if (userResult.length === 0) { //사용자 정보가 DB에 존재하지 않음. 회원가입 유도.
        console.log("SERVER :: Not User :: " + object.user_key);

        var resSQL = 'SELECT * FROM `tb_response_text` WHERE `intention` = ?'
        connection.query(resSQL, "Welcome", function (resError, resResult, body) {
          if (resError) {
            console.error("SERVER :: DB ERROR :: tb_response_text connection error");
            console.error(resError);
            res.end();
            return resError
          }

          var button = [
            {
              "action": "webLink", 
              "label": "현대 블루링크 로그인",
              "url": 'https://stg.kr-ccapi.hyundai.com/api/v1/user/oauth2/authorize?client_id=03f251b4-75ca-4042-bbc1-c8375a767a82&redirect_uri=http://58.225.115.230:23701/hmc/oauth2url&response_type=code&state=' + object.user_key
            }
          ];

          // 모니터링 DB에 등록 후에 응답 
          var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
          connection.query(udtSQL, [object.user_key, null, null, "Not User", object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
            if (udtErr) {
              console.error("SERVER :: DB ERROR :: monitoring DB update error");
              console.error(udtErr);
              res.end();
              return udtErr
            }

            res.json({
              "type": "messageButton",
              "text": resResult[0].response_text,
              "object1": JSON.stringify(button)
            });
          });
        });
      //추후 차량이 없는 회원이 가입했을 때 탈퇴 시킨 후 다시 회원가입 하면서 차량을 등록하라고 메세지 띄울 곳. 
      } else if (userResult[0].vehicleId == null || userResult[0].vehicleId == "") { //차량번호가 존재하지 않으면 차량 등록 안내 메세지
        console.log("SERVER :: Not User :: " + object.user_key);

        var resSQL = 'SELECT * FROM `tb_response_text` WHERE `intention` = ?'
        connection.query(resSQL, "Welcome", function (resError, resResult, body) {
          if (resError) {
            console.error("SERVER :: DB ERROR :: tb_response_text connection error");
            console.error(resError);
            res.end();
            return resError
          }

          var button = [
            {
              "action": "webLink",
              "label": "현대 블루링크 차량 등록",
              "url": 'https://stg.kr-ccapi.hyundai.com/api/v1/user/oauth2/authorize?client_id=03f251b4-75ca-4042-bbc1-c8375a767a82&redirect_uri=http://58.225.115.230:23701/hmc/oauth2url&response_type=code&state=' + object.user_key
            }
          ]

          // 모니터링 DB에 등록 후에 응답 
          var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
          connection.query(udtSQL, [object.user_key, null, null, "No Car", object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
            if (udtErr) {
              console.error("SERVER :: DB ERROR :: monitoring DB update error");
              console.error(udtErr);
              res.end();
              return udtErr
            }

            res.json({
              "type": "messageButton",
              "text": resResult[0].response_text,
              "object1": JSON.stringify(button)
            });
          });
        });
      } else { // 사용자 정보가 존재 
        //카카오 사용자 정보가 DB에 존재. 서비스 이용가능.
        var access_token = userResult[0].access_token;
        var authorization = userResult[0].authorization;
        var refresh_token = userResult[0].refresh_token;
        var token_type = userResult[0].token_type;
        var control_token = userResult[0].control_token;
        var saved_pin = userResult[0].pin;
        var vehicleId = userResult[0].vehicleId;
        var type = userResult[0].vehicleType;

        console.log("user command : " + object.content);
        console.log("user intention: " + intention);

        // 시나리오 뎁스가 있는 발화들의 경우, 
        // input intention 이 fail 이더라도 시나리오를 진행해야함 
        // 예) 17 도 
        // 이 때는 DB 정보를 활용해햐함
        // 따라서, DB 정보가 input intention보다 우선임
        var commandSQL = "SELECT * FROM `tb_command` WHERE `user_id` = ?";
        connection.query(commandSQL, object.user_key, function (comError, comResult, comBody) {
          if (comError) {
            console.error("SERVER :: DB ERROR :: tb_command connection error");
            console.error(comError);
            res.end();
            return comError
          }

          // 확인해야할 사항 
          var ctlCommand = comResult[0].control_command;
          var temperature = comResult[0].temp;
          var status = comResult[0].status;

          if (object.content == "제어 결과 확인") { // 제어 결과 확인 버튼 
            // DB 를 업데이트할 필요는 없음 
            var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
            connection.query(resSQL, ["Error", status], function (resError, resResult, resBody) {
              if (resError) {
                console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                console.error(resError);
                res.end();
                return resError
              }

              // 모니터링 DB에 등록 후에 응답 
              var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
              connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                if (udtErr) {
                  console.error("SERVER :: DB ERROR :: monitoring DB update error");
                  console.error(udtErr);
                  res.end();
                  return udtErr
                }

                res.json({
                  "type": resResult[0].response_type,
                  "text": resResult[0].response_text,
                  "object1": resResult[0].response_object1,
                  "object2": resResult[0].response_object2,
                });
              });
            });
          } else {
            if (ctlCommand == null) {
              // 최초 진입 
              // intention 에 따름
              // DB 업데이트 필요함
              switch(intention) {
                case "Buttons" :
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?"
                  connection.query(resSQL, ["Button", object.content], function (resError, resResult, resBody) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }  
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                  break;

                case "UserRemove":
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ?"
                  connection.query(resSQL, intention, function (resError, resResult, resBody) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }  
                    var delSQL = "DELETE FROM `tb_user_info` WHERE `user_id`=?"
                    connection.query(delSQL, object.user_key, function (delError, delResult, delBody) {
                      if (delError) {
                        console.error("SERVER :: DB ERROR :: tb_user_info deletion error");
                        console.error(delError);
                        return delError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                  break;

                case "Control_Engine_Start":
                  // 최초 진입
                  // 온도 확인
                  var temp = get_temperature(object.content);
                  console.log("SERVER :: Content : " + object.content + " :: Temperature : " + temp);
                  if (temp == "-1") {
                    // 온도가 없음
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [intention, '4001', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }
                      var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                      connection.query(resSQL, [intention, "noTemp"], function (resError, resResult, resBody) {
                        if (resError) {
                          console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                          console.error(resError);
                          res.end();
                          return resError
                        }

                        // 모니터링 DB에 등록 후에 응답 
                        var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                        connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                          if (udtErr) {
                            console.error("SERVER :: DB ERROR :: monitoring DB update error");
                            console.error(udtErr);
                            res.end();
                            return udtErr
                          }

                          res.json({
                            "type": resResult[0].response_type,
                            "text": resResult[0].response_text,
                            "object1": resResult[0].response_object1,
                            "object2": resResult[0].response_object2,
                          });
                        });
                      });
                    });
                  } else if (temp == "-237") {
                    // 온도가 범위를 벗어남 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [intention, '4001', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }
                      var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                      connection.query(resSQL, [intention, "tempError"], function (resError, resResult, resBody) {
                        if (resError) {
                          console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                          console.error(resError);
                          res.end();
                          return resError
                        }

                        // 모니터링 DB에 등록 후에 응답 
                        var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                        connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                          if (udtErr) {
                            console.error("SERVER :: DB ERROR :: monitoring DB update error");
                            console.error(udtErr);
                            res.end();
                            return udtErr
                          }

                          res.json({
                            "type": resResult[0].response_type,
                            "text": resResult[0].response_text,
                            "object1": resResult[0].response_object1,
                            "object2": resResult[0].response_object2,
                          });
                        });
                      });
                    });
                  } else {
                    // 적정 온도 입력 됨 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [intention, '4002', object.content, temp, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        return updError
                      }
                      var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                      connection.query(resSQL, [intention, "temp"], function (resError, resResult, resBody) {
                        if (resError) {
                          console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                          console.error(resError);
                          res.end();
                          return resError
                        }

                        // 모니터링 DB에 등록 후에 응답 
                        var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                        connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                          if (udtErr) {
                            console.error("SERVER :: DB ERROR :: monitoring DB update error");
                            console.error(udtErr);
                            res.end();
                            return udtErr
                          }

                          res.json({
                            "type": resResult[0].response_type,
                            "text": util.format(resResult[0].response_text, temp),
                            "object1": resResult[0].response_object1,
                            "object2": resResult[0].response_object2,
                          });
                        });
                      });
                    });
                  }
                  break;

                case "Control_Engine_Stop":
                case "Control_Door_Close":
                case "Control_Charge_Start":
                case "Control_Charge_Stop":
                case "Control_Horn_On":
                case "Control_Light_On":
                  var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                  connection.query(updateSQL, [intention, '7000', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                    if (updError) {
                      console.error("SERVER :: DB ERROR :: tb_command update error");
                      console.error(updError);
                      res.end();
                      return updError
                    }
                    var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                    connection.query(resSQL, [intention, "start"], function (resError, resResult, resBody) {
                      if (resError) {
                        console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                        console.error(resError);
                        res.end();
                        return resError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                  break;

                case "SmallTalk_Gloomy":
                case "SmallTalk_Hungry":
                case "SmallTalk_LetsPlay":
                  var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                  connection.query(updateSQL, [intention, '4001', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                    if (updError) {
                      console.error("SERVER :: DB ERROR :: tb_command update error");
                      console.error(updError);
                      res.end();
                      return updError
                    }
                    var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                    connection.query(resSQL, [intention, "enter"], function (resError, resResult, resBody) {
                      if (resError) {
                        console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                        console.error(resError);
                        res.end();
                        return resError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                  break;

                case "SmallTalk_Emoticon":
                  var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                  connection.query(updateSQL, [null, '200', null, null, null, object.user_key], function (updError, updResult, updBody) {
                    if (updError) {
                      console.error("SERVER :: DB ERROR :: tb_command update error");
                      console.error(updError);
                      res.end();
                      return updError
                    }

                    // 모니터링 DB에 등록 후에 응답 
                    var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                    connection.query(udtSQL, [object.user_key, type, status, intention, object.content, object.content], function (udtErr, udtResult, udtField) {
                      if (udtErr) {
                        console.error("SERVER :: DB ERROR :: monitoring DB update error");
                        console.error(udtErr);
                        res.end();
                        return udtErr
                      }

                      res.json({
                        "type": "simpleText",
                        "text": object.content
                      });
                    });
                  });

                  break;

                default:
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ?"
                  connection.query(resSQL, intention, function (resError, resResult, body) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }

                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', null, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                  break;
              }
            } else {
              // 최초 진입이 아닌 경우 
              // 즉, 어떤 시나리오에 무조건 포함되어 있는 경우에만 이 쪽으로 들어올 수 있음 
              // 시나리오에 포함이 되어 있다면, 여기서 처리할 정보들은 NLU 결과와 전혀 관계가 없음 
              // 따라서 변수 intention 은 무시함 
              // 여기서 intention은 ctlCommand 임 

              // 가장 먼저 이 전에 입력한 제어 명령이 수행 중일 수가 있음 
              // 이 때는 계속 진행 여부를 물어보는 것이 좋을 것으로 생각함 
              // 확인은 DB를 통해서 가능함 comResult.status
              if (comResult[0].status == "8000") { // 이전에 입력한 명령이 실행 중일 때
                if (intention.indexOf("Control") >= 0) { // 제어 명령이 실행 중일 때, 다시 제어 명령이 들어온 경우
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?";
                  connection.query(resSQL, ["Error", "8000"], function (resError, resResult, resBody) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }

                    // 모니터링 DB에 등록 후에 응답 
                    var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                    connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                      if (udtErr) {
                        console.error("SERVER :: DB ERROR :: monitoring DB update error");
                        console.error(udtErr);
                        res.end();
                        return udtErr
                      }

                      res.json({
                        "type": resResult[0].response_type,
                        "text": resResult[0].response_text,
                        "object1": resResult[0].response_object1,
                        "object2": resResult[0].response_object2,
                      });
                    });
                  });
                } else { // 제어 명령이 실행 중일 때, 제어가 아닌 다른 명령이 들어온 경우
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ?";
                  connection.query(resSQL, "Initialize", function (resError, resResult, resBody) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }

                    // 결과 출력이므로, DB 초기화가 필요 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });                
                  });
                }
              } else { // 수행 중인 제어 명령이 없는 경우 
                // 먼저 Pin 입력을 골라냄 
                if (intention == "PIN") {
                  var state = object.user_key; // 블루링크 전송용 정보
                  var insert_pin = object.content; // 사용자 입력 pin

                  var uuid_state = state + "&" + uuid.v1();
                  console.log("uuid_state : " + uuid_state);

                  console.log("state : " + state);
                  console.log("inserted pin : " + insert_pin);

                  if (insert_pin == saved_pin) {
                    // 이전에 실행 중인 작업이 끝나지 않은 경우
                    if (comResult[0].status == "8000") {
                      var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?"
                      connection.query(resSQL, ["Error", "8000"], function (resError, resResult, body) {
                        if (resError) {
                          console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                          console.error(resError);
                          res.end();
                          return resError
                        }

                        // 모니터링 DB에 등록 후에 응답 
                        var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                        connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                          if (udtErr) {
                            console.error("SERVER :: DB ERROR :: monitoring DB update error");
                            console.error(udtErr);
                            res.end();
                            return udtErr
                          }

                          res.json({
                            "type": resResult[0].response_type,
                            "text": resResult[0].response_text,
                            "object1": resResult[0].response_object1,
                            "object2": resResult[0].response_object2,
                          });
                        });
                      });
                    } else {
                      // 앞선 에러가 없을 경우, 
                      // 블루링크 연결 
                      console.log("access_teken : " + access_token);
                      var headers = headersForm(access_token);
                      var form;

                      if (ctlCommand == "Control_Engine_Start") {
                        form = engineStartForm(saved_pin, uuid_state, temperature);
                        //form = engineStartForm(saved_pin, state, temperature);
                      } else if (ctlCommand == "Control_Engine_Stop") {
                        form = engineStopForm(saved_pin, uuid_state);
                        //form = engineStopForm(saved_pin, state);
                      } else if (ctlCommand == "Control_Door_Close") {
                        form = closeDoorForm(saved_pin, uuid_state);
                        //form = closeDoorForm(saved_pin, state);
                      } else if (ctlCommand == "Control_Light_On" || ctlCommand == "Control_Horn_On") {
                        form = emergencyFlashingHornForm(saved_pin, uuid_state);
                        //form = emergencyFlashingHornForm(saved_pin, state);
                      } else if (ctlCommand == "Control_Charge_Start") {
                        form = chargeOnForm(saved_pin, uuid_state);
                        //form = chargeOnForm(saved_pin, state);
                      } else if (ctlCommand == "Control_Charge_Stop") {
                        form = chargeOffForm(saved_pin, uuid_state);
                        //form = chargeOffForm(saved_pin, state);
                      }

                      formData = JSON.stringify(form);
                      //Post 요청을 위해 데이터를 JSON 형식으로 변환하여 body에 포함

                      var options = {
                        'url': commandURL(ctlCommand, vehicleId),
                        'method': 'POST',
                        'headers': headers,
                        'body': formData,
                      }

                      console.log(options);

                      // Start the request
                      request(options, function (hmcError, hmcResponse, hmcBody) {
                        if (hmcError) {
                          console.error("SERVER :: Request for HMC server ERROR!");
                          console.error(hmcError);
                          res.end();
                          return hmcError
                        }
                        else {
                          console.log("SERVER :: Requesting for HMC");
                          console.log(hmcBody);
                          
                          var obj = JSON.parse(hmcBody);

                          if (obj.errMsg) {
                            /***************************************************
                            현대 API Server로 이미 명령을 전송 한 상태일 때
                            한번 더 명령 수행 요청 시 API 서버에서 명령 수행 중 or 
                            명령 중복 Message를 전송할 때 걸리는 조건.
                            ***************************************************/
                            console.log("SERVER :: HMC server error message :: " + obj.errMsg + " ("+ obj.errCode + ")");
                            var date = new Date();
                            console.log(date.toFormat('YYYY-MM-DD HH24:MI:SS'));
                            console.log("SERVER :: " + ctlCommand + " Command waiting : " + vehicleId);

                            var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?"
                            connection.query(resSQL, ["Error", obj.errCode], function (resError, resResult, resBody) {
                              if (resError) {
                                console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                                console.error(resError);
                                res.end();
                                return resError
                              }

                              // 모니터링 DB에 등록 후에 응답 
                              var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                              connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                                if (udtErr) {
                                  console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                  console.error(udtErr);
                                  res.end();
                                  return udtErr
                                }

                                res.json({
                                  "type": resResult[0].response_type,
                                  "text": resResult[0].response_text,
                                  "object1": resResult[0].response_object1,
                                  "object2": resResult[0].response_object2,
                                });
                              });
                            });
                          } else {
                            /***************************************************
                            챗봇 서버에서 현대 API Server로 명령 전달 후
                            수행 결과 도착 시 챗봇 서버와 소켓 연결 된
                            로그 클라이언트로 로그 내용 전송
                            ***************************************************/
                            var date = new Date();
                            console.log(date.toFormat('YYYY-MM-DD HH24:MI:SS'));
                            console.log("SERVER :: Pin Correct : HMC Response correct: " + insert_pin);

                            var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                            connection.query(updateSQL, [ctlCommand, '8000', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                              if (updError) {
                                console.error("SERVER :: DB ERROR :: tb_command update error");
                                console.error(updError);
                                res.end();
                                return updError
                              }

                              console.log("SERVER :: HMC Requested : " + ctlCommand);

                              var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?"
                              connection.query(resSQL, [ctlCommand, "end"], function (resError, resResult, resBody) {
                                if (resError) {
                                  console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                                  console.error(resError);
                                  res.end();
                                  return resError
                                }

                                if (ctlCommand == "Control_Engine_Start") {
                                  var message = util.format(resResult[0].response_text, temperature);
                                } else {
                                  var message = resResult[0].response_text;
                                }

                                // 모니터링 DB에 등록 후에 응답 
                                var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                                connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                                  if (udtErr) {
                                    console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                    console.error(udtErr);
                                    res.end();
                                    return udtErr
                                  }

                                  res.json({
                                    "type": resResult[0].response_type,
                                    "text": message,
                                    "object1": resResult[0].response_object1,
                                    "object2": resResult[0].response_object2,
                                  });
                                });
                              });
                            });
                          }
                        }
                      });
                    }

                    
                  } else {
                    // Pin 이 일치하지 않는 경우 
                    var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention` = ? AND `chatbot_status` = ?"
                    connection.query(resSQL, ["Error", "4003"], function (resError, resResult, resBody) {
                      if (resError) {
                        console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                        console.error(resError);
                        res.end();
                        return resError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  }
                } else if (intention == "Food") {
                  // 맛집이 발화로 입력된 경우임 
                  // 해당 맛집 정보를 출력해야함 
                  var foodSQL = "SELECT * FROM `tb_food_list` WHERE `name` = ?"
                  connection.query(foodSQL, object.content, function (foodError, foodResult, foodBody) {
                    if (foodError) {
                      console.error("SERVER :: DB ERROR : tb_food_list connection error");
                      console.error(foodError);
                      res.end();
                      return foodError
                    }

                    // 결과 출력이므로, DB 초기화가 필요 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, "image of location"], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }
                        res.json({
                          "type": "image",
                          "object1": foodResult[0].jpg,
                        });
                      });
                    });
                  });
                } else if (intention == "Location") {
                  // 여행지가 발화로 입력된 경우임 
                  // 해당 야헹지 정보를 출력해야함 
                  var tourSQL = "SELECT * FROM `tb_tour_list` WHERE `name` = ?"
                  connection.query(tourSQL, object.content, function (tourError, tourResult, tourBody) {
                    if (tourError) {
                      console.error("SERVER :: DB ERROR : tb_tour_list connection error");
                      console.error(tourError);
                      res.end();
                      return tourError
                    }

                    // 결과 출력이므로, DB 초기화가 필요 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, "image of location"], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": "image",
                          "object1": tourResult[0].jpg,
                        });
                      });
                    });
                  });
                } else if (intention == "Buttons") {
                  // SmallTalk 시나리오에서 No 버튼을 누른 경우
                  var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                  connection.query(resSQL, ["Button", object.content], function (resError, resResult, resBody) {
                    if (resError) {
                      console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                      console.error(resError);
                      res.end();
                      return resError
                    }

                    // 결과 출력이므로, DB 초기화가 필요 
                    var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                    connection.query(updateSQL, [null, '200', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                      if (updError) {
                        console.error("SERVER :: DB ERROR :: tb_command update error");
                        console.error(updError);
                        res.end();
                        return updError
                      }

                      // 모니터링 DB에 등록 후에 응답 
                      var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                      connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                        if (udtErr) {
                          console.error("SERVER :: DB ERROR :: monitoring DB update error");
                          console.error(udtErr);
                          res.end();
                          return udtErr
                        }

                        res.json({
                          "type": resResult[0].response_type,
                          "text": resResult[0].response_text,
                          "object1": resResult[0].response_object1,
                          "object2": resResult[0].response_object2,
                        });
                      });
                    });
                  });
                } else {
                  // 제대로 입력 됐다면 온도
                  // 아니라면, 시나리오 중에 잘못 입력됨

                  // 맛집 시나리오에서 Yes를 누른 경우
                  if (ctlCommand == "SmallTalk_Hungry" || ctlCommand == "SmallTalk_Gloomy") {
                    var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                    connection.query(resSQL, [ctlCommand, "yes"], function (resError, resResult, resBody) {
                      if (resError) {
                        console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                        console.error(resError);
                        res.end();
                        return resError
                      }

                      var dbSQL = resResult[0].response_object1;
                      connection.query(dbSQL, function (dbError, dbResult, dbBody) {
                        var items = [];
                        for (var i = 0; i < dbResult.length; i++) {
                          items.push({
                            "title": dbResult[i].name,
                            "description": dbResult[i].area,
                            "imageUrl": dbResult[i].jpg,
                            "homepage": dbResult[i].url,
                          });
                        }

                        // 모니터링 DB에 등록 후에 응답 
                        var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                        connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                          if (udtErr) {
                            console.error("SERVER :: DB ERROR :: monitoring DB update error");
                            console.error(udtErr);
                            res.end();
                            return udtErr
                          }

                          res.json({
                            "type": resResult[0].response_type,
                            "text": resResult[0].response_text,
                            "object1": items,
                          });
                        });
                      });
                    });
                  } else {
                    // 온도 확인
                    var temp = get_temperature(object.content);
                    //console.log("SERVER :: temp : " + temp);
                    if (temp == "-1") { // 온도가 발화 안에 없음 
                      // 현재 시나리오가 시동 걸기일 경우와 아닌 경우가 있음 
                      if (ctlCommand == "Control_Engine_Start") { // 현재 시나리오가 시동 걸기일 경우 
                        var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                        connection.query(updateSQL, [intention, '4001', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                          if (updError) {
                            console.error("SERVER :: DB ERROR :: tb_command update error");
                            console.error(updError);
                            res.end();
                            return updError
                          }

                          var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                          connection.query(resSQL, [intention, "noTemp"], function (resError, resResult, resBody) {
                            if (resError) {
                              console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                              console.error(resError);
                              res.end();
                              return resError
                            }

                            // 모니터링 DB에 등록 후에 응답 
                            var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                            connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                              if (udtErr) {
                                console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                console.error(udtErr);
                                res.end();
                                return udtErr
                              }

                              res.json({
                                "type": resResult[0].response_type,
                                "text": resResult[0].response_text,
                                "object1": resResult[0].response_object1,
                                "object2": resResult[0].response_object2,
                              });
                            });
                          });
                        });        
                      } else { // 현재 시나리오가 시동 걸기가 아닌 경우 
                        var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=?";
                        connection.query(resSQL, "Fail", function (resError, resResult, resBody) {
                          if (resError) {
                            console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                            console.error(resError);
                            res.end();
                            return resError
                          }

                          var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                          connection.query(updateSQL, [null, '200', null, null, null, object.user_key], function (updError, updResult, updBody) {
                            if (updError) {
                              console.error("SERVER :: DB ERROR :: tb_command update error");
                              console.error(updError);
                              res.end();
                              return updError
                            }

                            // 모니터링 DB에 등록 후에 응답 
                            var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                            connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                              if (udtErr) {
                                console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                console.error(udtErr);
                                res.end();
                                return udtErr
                              }

                              res.json({
                                "type": resResult[0].response_type,
                                "text": resResult[0].response_text,
                                "object1": resResult[0].response_object1,
                                "object2": resResult[0].response_object2,
                              });
                            });
                          });
                        });
                      }
                    } else if (temp == "-237") { // 온도가 범위를 벗어남 
                      var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                      connection.query(updateSQL, [intention, '4001', object.content, null, null, object.user_key], function (updError, updResult, updBody) {
                        if (updError) {
                          console.error("SERVER :: DB ERROR :: tb_command update error");
                          console.error(updError);
                          res.end();
                          return updError
                        }
                        var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                        connection.query(resSQL, [intention, "tempError"], function (resError, resResult, resBody) {
                          if (resError) {
                            console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                            console.error(resError);
                            res.end();
                            return resError
                          }

                          // 모니터링 DB에 등록 후에 응답 
                          var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                          connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                            if (udtErr) {
                              console.error("SERVER :: DB ERROR :: monitoring DB update error");
                              console.error(udtErr);
                              res.end();
                              return udtErr
                            }

                            res.json({
                              "type": resResult[0].response_type,
                              "text": resResult[0].response_text,
                              "object1": resResult[0].response_object1,
                              "object2": resResult[0].response_object2,
                            });
                          });
                        });
                      });
                    } else { // 적정 온도 입력 됨
                      var updateSQL = "UPDATE `tb_command` SET `control_command`=?, `status`=?, `input_utterance`=?, `temp`=?, `pin`=? WHERE `user_id`=?"
                      connection.query(updateSQL, [ctlCommand, '4002', object.content, temp, null, object.user_key], function (updError, updResult, updBody) {
                        if (updError) {
                          console.error("SERVER :: DB ERROR :: tb_command update error");
                          console.error(updError);
                          res.end();
                          return updError
                        }

                        if (ctlCommand == "Control_Engine_Start" || intention == "Control_Engine_Start") {
                          var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=? AND `chatbot_status`=?";
                          connection.query(resSQL, [ctlCommand, "temp"], function (resError, resResult, resBody) {
                            if (resError) {
                              console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                              console.error(resError);
                              res.end();
                              return resError
                            }

                            // 모니터링 DB에 등록 후에 응답 
                            var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                            connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                              if (udtErr) {
                                console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                console.error(udtErr);
                                res.end();
                                return udtErr
                              }

                              res.json({
                                "type": resResult[0].response_type,
                                "text": util.format(resResult[0].response_text, get_temperature(object.content)),
                                "object1": resResult[0].response_object1,
                                "object2": resResult[0].response_object2,
                              });
                            });
                          });
                        } else {
                          var resSQL = "SELECT * FROM `tb_response_text` WHERE `intention`=?";
                          connection.query(resSQL, "Fail", function (resError, resResult, resBody) {
                            if (resError) {
                              console.error("SERVER :: DB ERROR :: tb_response_text connection error");
                              console.error(resError);
                              res.end();
                              return resError
                            }

                            // 모니터링 DB에 등록 후에 응답 
                            var udtSQL = "INSERT INTO tb_monitoring(user_id, car_type, bluelink_status, intention, user_input, response_text) VALUES (?, ?, ?, ?, ?, ?)";
                            connection.query(udtSQL, [object.user_key, type, status, intention, object.content, resResult[0].response_text], function (udtErr, udtResult, udtField) {
                              if (udtErr) {
                                console.error("SERVER :: DB ERROR :: monitoring DB update error");
                                console.error(udtErr);
                                res.end();
                                return udtErr
                              }

                              res.json({
                                "type": resResult[0].response_type,
                                "text": resResult[0].response_text,
                                "object1": resResult[0].response_object1,
                                "object2": resResult[0].response_object2,
                              });
                            });
                          });
                        }
                      });
                    }
                  }
                }
              }
            }
          }
        });
      }
    });
  });
});

module.exports = router;
