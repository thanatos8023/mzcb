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

	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	var sql = "select * from SEOULCB_INPUTS";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		// Input table columns 
		// DOMAIN, SUBDOMAIN, INTENTION, UTT

		// 도메인 목록
		// 좌측 메뉴에 전시하기 위한 객체 
		var domainList = [];
		for (var i = 0; i < allResult.rows.length; i++) {
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {
				domainList.push(allResult.rows[i][0]);
			}
		}

		var menuList = [];
		for (var i = 0; i < domainList.length; i++) {
			// domain = domainList[i]
			// Searching on allResult
			var temp = [];
			for (var j = 0; j < allResult.rows.length; j++) {
				if (allResult.rows[j][0] === domainList[i]) {
					temp.push(allResult.rows[j][1]);
				}
			}
			menuList.push([domainList[i], temp]);
		}

		var uttList = [];
		if (intention.indexOf('null') < 0) {
			
			for (var i = 0; i < allResult.rows.length; i++) {
				if (allResult.rows[i][2] === intention) {
					uttList.push(allResult.rows[i][3]);
				}
			}
		}

		res.render('input', {
			menuList: menuList,
			uttList: uttList,
			nowPage: [domain, subdomain]
		});
	});
});

// Modify Output page
app.get('/response', function (req, res) {
	console.log('%%% Server log: /response ROUTER');

	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	//var sql = "SELECT * FROM MZCB_INPUTS";
	var sql = "SELECT * FROM SEOULCB_RESPONSE";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		// Input table columns 
		// DOMAIN, SUBDOMAIN, INTENTION, UTT

		// 도메인 목록
		// 좌측 메뉴에 전시하기 위한 객체 
		var domainList = [];
		for (var i = 0; i < allResult.rows.length; i++) {
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {
				domainList.push(allResult.rows[i][0]);
			}
		}

		var menuList = [];
		for (var i = 0; i < domainList.length; i++) {
			// domain = domainList[i]
			// Searching on allResult
			var temp = [];
			for (var j = 0; j < allResult.rows.length; j++) {
				if (allResult.rows[j][0] === domainList[i]) {
					temp.push(allResult.rows[j][1]);
				}
			}
			menuList.push([domainList[i], temp]);
		}

		var resText = '';
		if (intention.indexOf('null') < 0) {
			for (var i = 0; i < allResult.rows.length; i++) {
				if (allResult.rows[i][2] === intention) {
					resText = allResult.rows[i][3];
				}
			}
		}

		res.render('output', {
			menuList: menuList,
			resText: resText,
			nowPage: [domain, subdomain]
		});
	});
});

// Modify Rule page
app.get('/rule', function (req, res) {
	console.log('%%% Server log: /response ROUTER');

	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	// 기본적으로 도메인 목록은 무조건 전시해야함 
	//var sql = "SELECT * FROM MZCB_INPUTS";
	var sql = "SELECT * FROM SEOULCB_RULES";
	connection.execute(sql, function (allError, allResult, allNext) {
		if (allError) { // DB 불러오기 에러
			console.error("SERVER :: DB Connection : All Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		// Input table columns 
		// DOMAIN, SUBDOMAIN, INTENTION, UTT

		// 도메인 목록
		// 좌측 메뉴에 전시하기 위한 객체 
		var domainList = [];
		for (var i = 0; i < allResult.rows.length; i++) {
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {
				domainList.push(allResult.rows[i][0]);
			}
		}

		var menuList = [];
		for (var i = 0; i < domainList.length; i++) {
			// domain = domainList[i]
			// Searching on allResult
			var temp = [];
			for (var j = 0; j < allResult.rows.length; j++) {
				if (allResult.rows[j][0] === domainList[i]) {
					temp.push(allResult.rows[j][1]);
				}
			}
			menuList.push([domainList[i], temp]);
		}

		var morph1 = '';
		var morph2 = '';
		var morph3 = '';
		if (intention.indexOf('null') < 0) {
			for (var i = 0; i < allResult.rows.length; i++) {
				if (allResult.rows[i][2] === intention) {
					morph1 = allResult.rows[i][3];
					morph2 = allResult.rows[i][4];
					morph3 = allResult.rows[i][5];
				}
			}
		}

		res.render('output', {
			menuList: menuList,
			morph1: morph1,
			morph2: morph2,
			morph3: morph3,
			nowPage: [domain, subdomain]
		});
	});
});

// Input Utterance in DB
app.post('/input', function(req, res) {
	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	var newUserInput = req.body.newUserInput;

	console.log("%%% Server log: /input/"+intention+" ROUTER");
	console.log("New Input: " + newUserInput);

	//var sql = 'INSERT INTO MZCB_INPUTS (INTENTION, UTT) VALUES (:inte, :utt)';
	var sql = 'INSERT INTO SEOULCB_INPUTS (INTENTION, UTT) VALUES (:inte, :utt)';
	connection.execute(sql, {inte: intention, utt: newUserInput}, function(inErr, inResult, inFields){
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
app.post('/delete', function(req, res) {
	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	var checked_utt = req.body.checked_utt;

	console.log("%%% Server log: /delete/"+intention+" ROUTER");
	console.log("Checked Utterance: " + checked_utt);

	if (typeof(checked_utt) === typeof('string')) {
		//var sql = "DELETE FROM MZCB_INPUTS WHERE UTT=:utt";
		var sql = "DELETE FROM SEOULCB_INPUTS WHERE UTT=:utt";
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

		//var sql = "DELETE FROM MZCB_INPUTS WHERE UTT in " + utts;
		var sql = "DELETE FROM SEOULCB_INPUTS WHERE UTT in " + utts;
		connection.execute(sql, function(err, result, body) {
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
app.post('/updateres', function (req, res) {
	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	//console.log(req.body);
	var newText = req.body.newText;

	console.log("%%% Server log: /update"+intention+" ROUTER");
	console.log("New Text: " + newText);

	//var udtSQL = "UPDATE MZCB_RESPONSE SET RES_TEXT = :resText WHERE INTENTION = :inte";
	var udtSQL = "UPDATE SEOULCB_RESPONSE SET RES_TEXT = :resText WHERE INTENTION = :inte";
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
app.post('/updaterule', function (req, res) {
	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	//console.log(req.body);
	var newMorph1 = req.body.newmorph1;
	var newMorph2 = req.body.newmorph2;
	var newMorph3 = req.body.newmorph3;

	console.log("%%% Server log: /updaterule"+intention+" ROUTER");
	console.log("New Morph 1: " + newMorph1);
	console.log("New Morph 2: " + newMorph2);
	console.log("New Morph 3: " + newMorph3);

	//var udtSQL = "UPDATE MZCB_RULES SET  morph1 = :m1, morph2 = :m2, morph3 = :m3 WHERE intention = :inte"
	var udtSQL = "UPDATE SEOULCB_RULES SET  morph1 = :m1, morph2 = :m2, morph3 = :m3 WHERE intention = :inte"
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