// Express Loading
const express = require('express');
const app = express();

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
	res.send("이 기능은 추후에 구현될 예정입니다.");
});

app.post('/deleteview', function (req, res) {
	var sql = "DELETE FROM tb_monitoring";
	connection.query(sql, function (delErr, delResult, delField) {
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

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows.length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		res.render('input', {intList: intentionList});
	});
});

app.get('/mode/:intention', function (req, res) {
	var intention = req.params.intention;
	console.log('%%% Server log: /mode/' + intention + ' ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows[0].length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		console.log("SERVER :: Number of Intention :: " + intentionList.length);

		// 정보 출력
		var inSQL = "SELECT * FROM MZCB_INPUTS WHERE INTENTION = :inte";
		connection.execute(inSQL, {inte: intention}, function (inErr, inResult, inNext) {
			if (inErr) { // DB 불러오기 에러
				console.error("SERVER :: DB Connection : MZCB_INPUTS reading connection error");
				console.error(inErr);
				res.end();
				return inErr
			}

			var inList = []
			for (var j = 0; j < inResult.rows[0].length; i++) {
				inList.push(inResult.rows[0][i][1])
			}

		});

		res.render('input', {
			nowIntention: intention,
			intList: intentionList,
			inputList: inList
		});
	});
});

// Modify Output page
app.get('/response', function (req, res) {
	console.log('%%% Server log: /response ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows[0].length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		res.render('output', {intList: intentionList});
	});
});

app.get('/response/:intention', function(req, res) {
	console.log('%%% Server log: /response ROUTER');

	var intention = req.params.intention;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows[0].length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		var resSQL = "select * from MZCB_RESPONSE where INTENTION = :inte"
		connection.execute(resSQL, {inte: intention}, function (resErr, resResult) {
			if (resErr) { // DB 불러오기 에러
				console.error("SERVER :: DB Connection : MZCB_RESPONSE reading connection error");
				console.error(resErr);
				res.end();
				return resErr
			}

			// 정보 출력
			res.render('output', {
				intList: intentionList,
				nowIntention: intention,
				resText: resResult.rows[0][0][1]
			});
		})
	});
});

// Modify Rule page
app.get('/rule', function (req, res) {
	console.log('%%% Server log: /response ROUTER');

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows[0].length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		res.render('rule', {intList: intentionList});
	});
});

app.get('/rule/:intention', function(req, res) {
	console.log('%%% Server log: /rule ROUTER');

	var intention = req.params.intention;

	if (domain === "System") {
		res.redirect('/rule');
		return 200;
	}

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	var sql = "SELECT * FROM MZCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		var intentionList = [];
		for (var i = 0; i < allResult.rows[0].length; i++) {
			if (intentionList.indexOf(allResult.rows[i][0]) < 0) {
				intentionList.push(allResult.rows[i][0])
			}
		}

		// 정보 출력
		ruleSQL = "select * from MZCB_RULES where INTENTION = :inte";
		connection.execute(ruleSQL, {inte: intention}, function (ruleErr, ruleResult, ruleNext) {
			if (ruleErr) { // DB 불러오기 에러
				console.error("SERVER :: DB Connection : Rule Database reading connection error");
				console.error(ruleErr);
				res.end();
				return ruleErr
			}

			res.render('rule', {
				intList: intentionList,
				nowIntention: intention,
				morph1: ruleResult[0].rows[0][0][1],
				morph2: ruleResult[0].rows[0][0][2],
				morph3: ruleResult[0].rows[0][0][3]
			});
		});
	});
});

// Input Utterance in DB
app.post('/input/:intention', function(req, res) {
	var intention = req.params.intention;

	var newUserInput = req.body.newUserInput;

	console.log("%%% Server log: /input/"+intention+" ROUTER");
	console.log("New Input: " + newUserInput);

	var sql = 'INSERT INTO MZCB_INPUTS (intention) VALUES(:inte)';
	connection.execute(sql, {inte: intention}, function(inErr, inResult, inFields){
		if (inErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: insertion error");
			console.error(inErr);
			res.end();
			return inErr
		}

		console.log("%%% Server log: New information Successfully added in DB.");
		res.redirect('/mode/' + intention);
	});
});


// Delete Utterance in DB
app.post('/delete/:intention', function(req, res) {
	var intention = req.params.intention;

	var checked_utt = req.body.checked_utt;

	console.log("%%% Server log: /delete/"+intention+" ROUTER");
	console.log("Checked Utterance: " + checked_utt);

	if (typeof(checked_utt) === typeof('string')) {
		var sql = "DELETE FROM MZCB_INPUTS WHERE UTT=:utt";
		connection.execute(sql, {utt: checked_utt}, function(err, result, body) {
			if (err) {
				console.error("SERVER :: DB CONNECTION ERROR :: deletion error");
				console.error(err);
				res.end();
				return err
			}
			console.log("%%% Server log: /delete ROUTER :: Successfully delete [" + checked_utt + "] in DB.");
			res.redirect('/mode/' + intention);
		});	
	}
	else {
		for (var i = 0; i < checked_utt.length; i++) {
			checked_utt[i] = `'${checked_utt[i]}'`;
		}
		var utts = checked_utt.join();
		utts = `(${utts})`;

		var sql = "DELETE FROM tb_user_input WHERE user_input in " + utts;
		connection.query(sql, function(err, result, body) {
			if (err) {
				console.error("SERVER :: DB CONNECTION ERROR :: deletion error");
				console.error(err);
				res.end();
				return err
			}
			console.log("%%% Server log: /delete ROUTER :: Successfully delete [" + checked_utt + "] in DB.");
			res.redirect('/mode/' + intention);
		});	
	}
	
});


// Update response
app.post('/updateres/:intention', function (req, res) {
	var intention = req.params.intention;

	//console.log(req.body);
	var newText = req.body.newText;

	console.log("%%% Server log: /update"+intention+" ROUTER");
	console.log("New Text: " + newText);

	var udtSQL = "UPDATE MZCB_RESPONSE SET RES_TEXT = :resText WHERE INTENTION = :inte";
	connection.execute(udtSQL, {resText: newText, inte: intention}, function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.end();
			return udtErr
		}

		console.log("%%% Server log: /updateres ROUTER :: Successfully Update [" + intention + "]  response in DB.");
		res.redirect('/response/' + intention);
	});
});


// Update rule
app.post('/updaterule/:intention', function (req, res) {
	var intention = req.params.intention;

	//console.log(req.body);
	var newMorph1 = req.body.newmorph1;
	var newMorph2 = req.body.newmorph2;
	var newMorph3 = req.body.newmorph3;

	console.log("%%% Server log: /updaterule"+intention+" ROUTER");
	console.log("New Morph 1: " + newMorph1);
	console.log("New Morph 2: " + newMorph2);
	console.log("New Morph 3: " + newMorph3);

	var udtSQL = "UPDATE MZCB_RULES SET  morph1 = :m1, morph2 = :m2, morph3 = :m3 WHERE intention = :inte"
	connection.query(udtSQL, {m1:newMorph1, m2:newMorph2, m3:newMorph3, inte:intention}, function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.end();
			return udtErr
		}

		console.log("%%% Server log: /updaterule ROUTER :: Successfully Update [" + intention + "]  rule in DB.");
		res.redirect('/rule/' + intention);
	});
});