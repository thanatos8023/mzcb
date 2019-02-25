var request = require('request');
var querystring = require('querystring')
var mysql_dbc = require('../db/db_con')();
var connection = mysql_dbc.init();
mysql_dbc.test_open(connection);

// costommer pin, Aurhorization code
function get_infomation_for_control (where) {
	var sql = 'SELECT * FROM test_session WHERE id =?';
	connection.query(sql, [where], function(err, result) {
		if (err) {
			console.log('DB ERROR: check the sql');
			console.log(err);
		}
		var information = {
			pin: result[0].pin,
			auth: result[0].authorization,
			vID: result[0].vehicleID,
			uID: result[0].kakao_info
		};
	})
	return information;
}

function get_intention() {
	return '내차 23도로 시동 켜줘';
}

// callback url
//var callback_url = "http://13.125.73.118:3000/hmc/controlcallbackurl";

// 최종 목표형
function get_api_idialFORM(intention, params, vehicleID)
{
	// exception processing
	if(!params.pin)
	{
		console.log('Undefined PIN');
		return false;
	}

	var home = 'http://bluelink.connected-car.io/api/v1/vehicles/';
	var apis = {
		engine_control:'/control/engine',
		door_control:'/control/door',
		light_control:'/control/light',
		horn_control:'/control/horn',
		charge_control:'/control/charge'
	};

	var api_url;

	// Necessary paramerters are different by intention
	// StartEngine, StopEngine, OpenCarDoor, CloseCarDoor, StartCharging, StopCharging, TurnOnOtherFunction
	if (intention === 'StartEngine' || intention === 'StartEngine')
	{
		// Mandantory parameter
		if (!params.action)
		{
			console.log('undefined Action');
			return false;
		}

		// Make api url
		var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
	}
	else if (intention === 'OpenCarDoor' || intention === 'CloseCarDoor')
	{
		// Mandantory parameter
		if (!params.action)
		{
			console.log('undefined Action');
			return false;
		}

		// Make api url
		var api = home + vehicleID + apis.door_control + '?' + querystring.stringify(params);
	}
	else if (intention === 'StartCharging' || intention === 'StopCharging')
	{
		// Mandantory parameter
		if (!params.action)
		{
			console.log('undefined Action');
			return false;
		}

		// Make api url
		var api = home + vehicleID + apis.charge_control + '?' + querystring.stringify(params);
	}
	else if (intention === 'TurnOnOtherFunction')
	{
		var api = home + vehicleID + apis.charge_control + '?' + querystring.stringify(params);
	}
	else
	{
		console.log('undefined Intention');
		return false;
	}

	return api_url;
}

// 임시 시연용 
function get_api_temporalFORM(intention, vehicleID, msgId, pin)
{
	// exception processing
	if(!params.pin)
	{
		console.log('Undefined PIN');
		return false;
	}

	var home = 'http://bluelink.connected-car.io/api/v1/vehicles/';
	var apis = {
		engine_control:'/control/engine',
		door_control:'/control/door',
		light_control:'/control/light',
		horn_control:'/control/horn',
		charge_control:'/control/charge'
	};

	var api_url;

	// Necessary paramerters are different by intention
	// StartEngine, StopEngine, OpenCarDoor, CloseCarDoor, StartCharging, StopCharging, TurnOnOtherFunction
	switch (intention) {
		case '내차 23도로 시동 켜줘':
		case '내차 23도로 시동 켜':
		case '내차 온도를 23도로 맞춰줘':
		case '내차 23도로 설정해줘':
		case '내차 온도를 23도로 조절해줘':
		case '내차 온도를 23도로 켜줘':
		case '내차 온도를 23도로 맞춰':
		case '내차 온도를 23도로 설정해줘':
		case '내차 온도를 23도로 조절해줘':
		case '내차 온도를 23도로 켜':
		case '내차 공조를 23도로 맞춰줘':
		case '내차 공조를 23도로 설정해줘':
		case '내차 공조를 23도로 조절해줘':
		case '내차 공조를 23도로 켜줘':
		case '내차 공조를 23도로 맞춰':
		case '내차 공조를 23도로 설정해줘':
		case '내차 공조를 23도로 조절해줘':
		case '내차 공조를 23도로 켜':
			params = {
				action: 'start',
				pin: pin,
				temp: 23,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
			break;

		case '내차 최대로 시동 켜줘':
		case '내차 최대로 시동 켜':
		case '내차 온도를 최대로 맞춰줘':
		case '내차 온도를 최대로 설정해줘':
		case '내차 온도를 최대로 조절해줘':
		case '내차 온도를 최대로 켜줘':
		case '내차 온도를 최대로 맞춰':
		case '내차 온도를 최대로 설정해줘':
		case '내차 온도를 최대로 조절해줘':
		case '내차 온도를 최대로 켜':
		case '내차 공조를 최대로 맞춰줘':
		case '내차 공조를 최대로 설정해줘':
		case '내차 공조를 최대로 조절해줘':
		case '내차 공조를 최대로 켜줘':
		case '내차 공조를 최대로 맞춰':
		case '내차 공조를 최대로 설정해줘':
		case '내차 공조를 최대로 조절해줘':
		case '내차 공조를 최대로 켜':
			params = {
				action: 'start',
				pin: pin,
				temp: 27,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
			break;

		case '내차 최소로 시동 켜줘':
		case '내차 최소로 시동 켜':
		case '내차 온도를 최소로 맞춰줘':
		case '내차 온도를 최소로 설정해줘':
		case '내차 온도를 최소로 조절해줘':
		case '내차 온도를 최소로 켜줘':
		case '내차 온도를 최소로 맞춰':
		case '내차 온도를 최소로 설정해줘':
		case '내차 온도를 최소로 조절해줘':
		case '내차 온도를 최소로 켜':
		case '내차 최저로 시동 켜줘':
		case '내차 최저로 시동 켜':
		case '내차 온도를 최저로 맞춰줘':
		case '내차 온도를 최저로 설정해줘':
		case '내차 온도를 최저로 조절해줘':
		case '내차 온도를 최저로 켜줘':
		case '내차 온도를 최저로 맞춰':
		case '내차 온도를 최저로 설정해줘':
		case '내차 온도를 최저로 조절해줘':
		case '내차 온도를 최저로 켜':
		case '내차 공조를 최소로 맞춰줘':
		case '내차 공조를 최소로 설정해줘':
		case '내차 공조를 최소로 조절해줘':
		case '내차 공조를 최소로 켜줘':
		case '내차 공조를 최소로 맞춰':
		case '내차 공조를 최소로 설정해줘':
		case '내차 공조를 최소로 조절해줘':
		case '내차 공조를 최소로 켜':
		case '내차 공조를 최저로 맞춰줘':
		case '내차 공조를 최저로 설정해줘':
		case '내차 공조를 최저로 조절해줘':
		case '내차 공조를 최저로 켜줘':
		case '내차 공조를 최저로 맞춰':
		case '내차 공조를 최저로 설정해줘':
		case '내차 공조를 최저로 조절해줘':
		case '내차 공조를 최저로 켜':
			params = {
				action: 'start',
				pin: pin,
				temp: 17,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
			break;

		case '내차 시동 켜줘':
		case '내차 시동 켜':
			console.log('ERROR: undefined temp')
			return false

		case '내차 시동 꺼줘':
		case '내차 시동 꺼':
			params = {
				action: 'stop',
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
			break;
/*
		case '내차 문열어줘':
		case '내차 문열어':
		case '내차 문열어줘':
		case '내차 도어 열어줘':
		case '내차 도어 열어':
		case '내차 차문 열어줘':
		case '내차 차문 열어':
			params = {
				action: 'open',
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.engine_control + '?' + querystring.stringify(params);
			break;
*/
		case '내차 문닫아줘':
		case '내차 문 닫아':
		case '내차 문 잠궈':
		case '내차 차문 닫아줘':
		case '내차 차문 닫아':
		case '내차 차문 잠궈':
		case '내차 차문 잠궈줘':
		case '내차 도어 닫아줘':
		case '내차 도어 닫아':
		case '내차 도어 잠궈':
		case '내차 도어 잠궈줘':
			params = {
				action: 'close',
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.door_control + '?' + querystring.stringify(params);
			break;

		case '내차 충전 해':
		case '내차 충전 해줘':
		case '내차 충전 시작':
		case '내차 충전 시작해줘':
		case '내차 즉시 충전 해':
		case '내차 즉시 충전 해줘':
		case '내차 즉시 충전 시작':
		case '내차 즉시 충전 시작해줘':
		case '내차 원격 충전 해':
		case '내차 원격 충전 해줘':
		case '내차 원격 충전 시작':
		case '내차 원격 충전 시작해줘':
			params = {
				action: 'start',
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.charge_control + '?' + querystring.stringify(params);
			break;

		case '내차 충전 그만해':
		case '내차 충전 그만해줘':
		case '내차 충전 멈춰줘':
		case '내차 충전 종료해':
		case '내차 충전 종료해줘':
		case '내차 즉시 충전 그만해':
		case '내차 즉시 충전 그만해줘':
		case '내차 즉시 충전 멈춰줘':
		case '내차 즉시 충전 종료해':
		case '내차 즉시 충전 종료해줘':
		case '내차 원격 충전 그만해':
		case '내차 원격 충전 그만해줘':
		case '내차 원격 충전 멈춰줘':
		case '내차 원격 충전 종료해':
		case '내차 원격 충전 종료해줘':
			params = {
				action: 'stop',
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.charge_control + '?' + querystring.stringify(params);
			break;

		case '내차 경적 켜':
		case '내차 경적 켜줘':
		case '내차 경적 울려줘':
		case '내차 경적 울려':
		case '내차 경적 시작':
		case '내차 경적 시작해줘':
		case '내차 크락션 켜':
		case '내차 크락션 켜줘':
		case '내차 크락션 울려줘':
		case '내차 크락션 울려':
		case '내차 크락션 시작':
		case '내차 크락션 시작해줘':
			params = {
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.horn_control + '?' + querystring.stringify(params);
			break;

		case '내차 비상등 켜줘':
		case '내차 비상등 켜':
		case '내차 깜빡이 켜줘':
		case '내차 깜빡이 켜':
			params = {
				pin: pin,
				msgId: msgId
			};

			// Make api url
			var api = home + vehicleID + apis.light_control + '?' + querystring.stringify(params);
			break;

		default:
			console.log('undefined Intention');
			return false;
	}

	return api_url;
}

function request_test() {
	// get information from DB
	var information = get_infomation_for_control(1);

	// make options
	var options = {
		url: get_api_temporalFORM(get_intention(), information.vID, information.uID, information.pin),
		headers: {
			'Authorization': 'base '+information.auth,
			'Content-Type': 'application/json'
		},
		method: 'POST'
	};

	// Callback function
	function callback(error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	// Successfully connected
	  	request.get(callback_url, function(err, res, body){
	  		if(err) {
	  			console.log(err);
	  			res.send('Internal Server Error');
	  		} else {
	  			console.log('Successed!!!');
	  			console.log(body);
	  		}
	  	})
	  } else {
	  	// Connected fail
	  	console.log('Fail...');
	  	console.error(body);
	  	console.log('Status code: '+response.statusCode)
	  }
	};

	// Call the request function
	request(options, callback);	
}

// call for test
request_test();

/*
// Engine Start 
var engine_start_params = {
	// Mandantory
	action: 'start',
	pin: pin,
	temp:24,
	// Optional
	unit:'C',
	msgId:'msg'
};

// Engine stop
var engine_stop_params = {
	// Mandantory
	action: 'start',
	pin: pin,
	// Optional
	temp:24,
	unit:'C',
	msgId:'msg'
};

// Door lock
var doorlock_params = {
	// Mandantory
	action: 'close',
	pin: pin,
	// Optional
	msgId:'msg'
};

// Signal light, horn
var light_params = {
	// Mandantory
	pin: pin,
	// Optional
	msgId:'msg'
};

var horm_params = {
	// Mandantory
	pin: pin,
	// Optional
	msgId:'msg'
}

// Charge control
var charge_start_params = {
	// Mandantory
	action: 'start',
	pin: pin,
	// Optional
	chargeRatio: 80,
	msgId:'msg'
};

var charge_stop_params = {
	// Mandantory
	action: 'start',
	pin: pin,
	// Optional
	chargeRatio: 80,
	msgId:'msg'
};
*/

