// Express Loading
const express = require('express');
const app = express();

// MySQL setting
// Definition
const mysql = require('mysql');
const conn_db = mysql.createConnection({
  host     : 'localhost',
  user     : 'hmc',
  password : 'aleldjwps',
  database : 'hmc_chatbot'
});

// Connection
conn_db.connect();

// BodyParser Loading
const bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Setting for using jade
app.set('views', './views');
app.set('view engine', 'jade');

app.use(express.static('public/'));

// Location
app.listen(23705, function(){
	console.log('Connected, 23705 port!');
});

// Monitoring page
app.get('/view', function(req, res) {
	var sql = "SELECT * FROM tb_monitoring"
	conn_db.query(sql, function(err, monit_info, body) {
		if (err) {
			console.error("SERVER :: DB ERROR :: tb_monitoring selection error!");
			console.error(err);
			res.end();
			return err
		}

		console.log("rows: ", monit_info.length);
		//console.log("sample: ", monit_info[0]);
		
		var ids = [];
		var types = [];
		var status = [];
		var intentions = [];
		var inputs = [];
		var responses = [];
		var idxs = [];
		for (var i = 0; i < monit_info.length; i++) {
			ids.push(monit_info[i].user_id);
			types.push(monit_info[i].car_type);
			status.push(monit_info[i].bluelink_status);
			intentions.push(monit_info[i].intention);
			inputs.push(monit_info[i].user_input);
			responses.push(monit_info[i].response_text);
			idxs.push(i);
		}

		//console.log(status);

		res.render('view', {
			ids: ids,
			types: types,
			status: status,
			intentions: intentions,
			inputs: inputs,
			responses: responses,
			idxs: idxs
		});
	});
});

app.post('/deleteview', function (req, res) {
	var sql = "DELETE FROM tb_monitoring";
	conn_db.query(sql, function (delErr, delResult, delField) {
		if (delErr) {
			console.error("SERVER :: DB Connection : tb_monitoring deletion connection error");
			console.error(delErr);
			res.end();
			return delErr
		}

		console.log("SERVER :: tb_monitoring initialized");

		res.redirect('/view');
	});
});

// Modify Input page
app.get('/mode', function (req, res) {
	console.log('%%% Server log: /mode ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		res.render('input', {domList: domainList});
	});
});

app.get('/mode/:domain', function (req, res) {
	var domain = req.params.domain;
	console.log('%%% Server log: /mode/' + domain + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		console.log("SERVER :: Number of Intention :: " + intentionList.length);

		res.render('input', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList
		});
	});
});

app.get('/mode/:domain/:intention', function (req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;

	console.log('%%% Server log: /mode/' + domain + '/' + intention + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		var statusList = [];
		for (var i = 0; i < allResult.length; i ++) {
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}
		}

		res.render('input', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList,
			nowIntention: intention,
			stList: statusList
		});
	});
});

app.get('/mode/:domain/:intention/:status', function(req, res) {
	console.log('%%% Server log: /mode ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		var intentionList = [];
		var statusList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}

			if (allResult[i].domain == domain && allResult[i].intention == intention && allResult[i].chatbot_status == status) {
				var response_type = allResult[i].response_type;
				var response_text = allResult[i].response_text;
				var response_object1 = allResult[i].response_object1;
				var response_object2 = allResult[i].response_object2;
			}
		}

		// 정보 출력
		var inSQL = "SELECT * FROM tb_user_input WHERE domain = ? AND intention = ?";
		conn_db.query(inSQL, [domain, intention], function (inError, inResult, inBody) {
			if (inError) {
				console.error("SERVER :: DB Connection : User Input Database reading connection error");
				console.error(inError);
				res.end();
				return inError
			}

			var ruleSQL = "SELECT * FROM tb_rule WHERE domain = ? AND intention = ?";
			conn_db.query(ruleSQL, [domain, intention], function (ruleError, ruleResult, ruleBody) {
				if (ruleError) {
					console.error("SERVER :: DB Connection : Rule Database reading connection error");
					console.error(ruleError);
					res.end();
					return ruleError
				}

				res.render('input', {
					domList: domainList,
					nowDomain: domain,
					intList: intentionList,
					nowIntention: intention,
					stList: statusList,
					nowStatus: status,
					resType: response_type,
					resText: response_text,
					resObj1: response_object1,
					resObj2: response_object2,
					inputList: inResult,
					ruleList: ruleResult[0]
				});
			});
		});
	});
});

// Modify Output page
app.get('/response', function (req, res) {
	console.log('%%% Server log: /response ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		res.render('output', {domList: domainList});
	});
});

app.get('/response/:domain', function (req, res) {
	var domain = req.params.domain;
	console.log('%%% Server log: /response/' + domain + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		console.log("SERVER :: Number of Intention :: " + intentionList.length);

		res.render('output', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList
		});
	});
});

app.get('/response/:domain/:intention', function (req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;

	console.log('%%% Server log: /response/' + domain + '/' + intention + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		var statusList = [];
		for (var i = 0; i < allResult.length; i ++) {
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}
		}

		res.render('output', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList,
			nowIntention: intention,
			stList: statusList
		});
	});
});

app.get('/response/:domain/:intention/:status', function(req, res) {
	console.log('%%% Server log: /response ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		var intentionList = [];
		var statusList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}

			if (allResult[i].domain == domain && allResult[i].intention == intention && allResult[i].chatbot_status == status) {
				var response_type = allResult[i].response_type;
				var response_text = allResult[i].response_text;
				var response_object1 = allResult[i].response_object1;
				var response_object2 = allResult[i].response_object2;
			}
		}

		// 정보 출력
		res.render('output', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList,
			nowIntention: intention,
			stList: statusList,
			nowStatus: status,
			resType: response_type,
			resText: response_text,
			resObj1: response_object1,
			resObj2: response_object2
		});
	});
});

// Modify Rule page
app.get('/rule', function (req, res) {
	console.log('%%% Server log: /rule ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		res.render('rule', {domList: domainList});
	});
});

app.get('/rule/:domain', function (req, res) {
	var domain = req.params.domain;
	console.log('%%% Server log: /rule/' + domain + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		console.log("SERVER :: Number of Intention :: " + intentionList.length);

		res.render('rule', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList
		});
	});
});

app.get('/rule/:domain/:intention', function (req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;

	console.log('%%% Server log: /rule/' + domain + '/' + intention + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
		}

		// 의도 목록은 반드시 필요함 
		var intentionList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
		}

		var statusList = [];
		for (var i = 0; i < allResult.length; i ++) {
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}
		}

		res.render('rule', {
			domList: domainList,
			nowDomain: domain,
			intList: intentionList,
			nowIntention: intention,
			stList: statusList
		});
	});
});

app.get('/rule/:domain/:intention/:status', function(req, res) {
	console.log('%%% Server log: /rule ROUTER');

	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	if (domain === "System") {
		res.redirect('/rule');
		return 200;
	}

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM tb_response_text";
	conn_db.query(sql, function (allError, allResult, allBody) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var domainList = [];
		var intentionList = [];
		var statusList = [];
		for (var i = 0; i < allResult.length; i++) {
			if (domainList.indexOf(allResult[i].domain) < 0) {
				domainList.push(allResult[i].domain);
			}
			if (intentionList.indexOf(allResult[i].intention) < 0 && allResult[i].domain == domain) { // 도메인이 일치하면서, 목록에 추가되지 않은 의도만 
				intentionList.push(allResult[i].intention);
			}
			if (statusList.indexOf(allResult[i].chatbot_status) < 0 && allResult[i].intention == intention) {
				statusList.push(allResult[i].chatbot_status);
			}
		}

		// 정보 출력
		ruleSQL = "select * from TB_RULE where domain = ? and intention = ?";
		conn_db.query(ruleSQL, [domain, intention], function (ruleErr, ruleResult, ruleNext) {
			if (ruleErr) { // DB 불러오기 에러
				console.error("SERVER :: DB Connection : Rule Database reading connection error");
				console.error(ruleErr);
				res.end();
				return ruleErr
			}

			res.render('rule', {
				domList: domainList,
				nowDomain: domain,
				intList: intentionList,
				nowIntention: intention,
				stList: statusList,
				nowStatus: status,
				morph1: ruleResult[0].morph1,
				morph2: ruleResult[0].morph2,
				morph3: ruleResult[0].morph3
			});
		});
	});
});

// Input Utterance in DB
app.post('/input/:domain/:intention/:status', function(req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	var newUserInput = req.body.newUserInput;

	console.log("%%% Server log: /input ROUTER");
	console.log("New Input: " + newUserInput);

	var sql = 'INSERT INTO tb_user_input (domain, intention, user_input) VALUES(?, ?, ?)';
	conn_db.query(sql, [domain, intention, newUserInput], function(inErr, inResult, inFields){
		if (inErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: insertion error");
			console.error(inErr);
			res.end();
			return inErr
		}

		console.log("%%% Server log: New information Successfully added in DB.");
		res.redirect('/mode/' + domain + '/' + intention + '/' + status);
	});
});


// Delete Utterance in DB
app.post('/delete/:domain/:intention/:status', function(req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	var checked_utt = req.body.checked_utt;

	console.log("%%% Server log: /deleteinput ROUTER");
	console.log("Checked Utterance: " + checked_utt);

	if (typeof(checked_utt) === typeof('string')) {
		var sql = "DELETE FROM tb_user_input WHERE user_input=?";
		conn_db.query(sql, [checked_utt], function(err, result, body) {
			if (err) {
				console.error("SERVER :: DB CONNECTION ERROR :: deletion error");
				console.error(err);
				res.end();
				return err
			}
			console.log("%%% Server log: /delete ROUTER :: Successfully delete [" + checked_utt + "] in DB.");
			res.redirect('/mode/' + domain + '/' + intention + '/' + status);
		});	
	}
	else {
		for (var i = 0; i < checked_utt.length; i++) {
			checked_utt[i] = `'${checked_utt[i]}'`;
		}
		var utts = checked_utt.join();
		utts = `(${utts})`;

		var sql = "DELETE FROM tb_user_input WHERE user_input in " + utts;
		conn_db.query(sql, function(err, result, body) {
			if (err) {
				console.error("SERVER :: DB CONNECTION ERROR :: deletion error");
				console.error(err);
				res.end();
				return err
			}
			console.log("%%% Server log: /delete ROUTER :: Successfully delete [" + checked_utt + "] in DB.");
			res.redirect('/mode/' + domain + '/' + intention + '/' + status);
		});	
	}
	
});


// Update response
app.post('/updateres/:domain/:intention/:status', function (req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	//console.log(req.body);
	var newType = req.body.newType;
	var newText = req.body.newText;
	var newObj1 = req.body.newObj1;
	var newObj2 = req.body.newObj2;

	console.log("%%% Server log: /update ROUTER");
	console.log("New Type: " + newType);
	console.log("New Text: " + newText);
	console.log("New Object1: " + newObj1);
	console.log("New Object2: " + newObj2);

	var udtSQL = "UPDATE tb_response_text SET response_type = ?, response_text = ?, response_object1 = ?, response_object2 = ? WHERE domain = ? AND intention = ? AND chatbot_status = ?";
	conn_db.query(udtSQL, [newType, newText, newObj1, newObj2, domain, intention, status], function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.end();
			return udtErr
		}

		console.log("%%% Server log: /updateres ROUTER :: Successfully Update [" + intention + "]  response in DB.");
		res.redirect('/response/' + domain + '/' + intention + '/' + status);
	});
});


// Update rule
app.post('/updaterule/:domain/:intention/:status', function (req, res) {
	var domain = req.params.domain;
	var intention = req.params.intention;
	var status = req.params.status;

	//console.log(req.body);
	var newMorph1 = req.body.newmorph1;
	var newMorph2 = req.body.newmorph2;
	var newMorph3 = req.body.newmorph3;

	console.log("%%% Server log: /updaterule ROUTER");
	console.log("New Morph 1: " + newMorph1);
	console.log("New Morph 2: " + newMorph2);
	console.log("New Morph 3: " + newMorph3);

	var udtSQL = "UPDATE tb_rule SET  morph1 = ?, morph2 = ?, morph3 = ? WHERE domain = ? AND intention = ?"
	conn_db.query(udtSQL, [newMorph1, newMorph2, newMorph3, domain, intention], function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.end();
			return udtErr
		}

		console.log("%%% Server log: /updaterule ROUTER :: Successfully Update [" + intention + "]  rule in DB.");
		res.redirect('/rule/' + domain + '/' + intention + '/' + status);
	});
});