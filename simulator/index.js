// Express Loading
const express = require('express');
const path = require('path');
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
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'views')));

// Location
app.listen(23705, function(){
	console.log('Connected, 23705 port!');
});

function oracle_get_key (db_result, col_num) {
	var keys = [];
	for (var i = 0; i < db_result.rows.length; i++) {
		keys.push(db_result.rows[i][col_num]);
	}

	keys = Array.from(new Set(keys));

	return keys
}

// Monitoring page
app.get('/view', function(req, res) {
	var sql = "select * from SEOULCB_INFO";
	connection.execute(sql, function (allErr, allResult, allNext) {
		if (allErr) {
			console.error("SERVER :: DB Connection : Information Database reading connection error");
			console.error(allError);
			res.end();
			return allError
		}

		//console.log(allResult);
		// 0:USER_ID, 1:USER_UTTERANCE, 2:USER_ATIME, 3:USER_NEW, 4:NLU_RESULT, 5:RES_SCENARIO, 6:RES_BLOCK, 7:RES_MESSAGE, 8:RES_TYPE
		var userKey = oracle_get_key(allResult, 0);
		var inputKey = oracle_get_key(allResult, 1);
		var clsKey = oracle_get_key(allResult, 4);
		var scenKey = oracle_get_key(allResult, 5);
		var blcKey = oracle_get_key(allResult, 6);

		// Need to return
		// 1. Scenario list, Block list, Call count
		var scenTable = [];
		for (var i = 0; i < scenKey.length; i++) {
			for (var j = 0; j < blcKey.length; j++) {
				// Counting by conditions
				var cnt = 0;
				for (var k = 0; k < allResult.rows.length; k++) {
					if (allResult.rows[k][5] === scenKey[i] & allResult.rows[k][6] === blcKey[j]) {
						cnt++;
					}
				}

				// Add to result array
				if (cnt > 0) {
					scenTable.push([scenKey[i], blcKey[j], cnt]);
				}
			}
		}

		// 2. User ID, Scenario list, Block list, Call count
		var userTable = [];
		for (var i = 0; i < userKey.length; i++) {
			for (var j = 0; j < scenKey.length; j++) {
				for (var k = 0; k < blcKey.length; k++) {
					// Counting by conditions
					var cnt = 0
					for (var l = 0; l < allResult.rows.length; l++) {
						if (allResult.rows[l][5] === scenKey[j] & allResult.rows[l][6] === blcKey[k] & allResult.rows[l][0] === userKey[i]) {
							cnt++;
						}
					}

					// Add to result array
					if (cnt > 0) {
						userTable.push([userKey[i], scenKey[j], blcKey[k], cnt]);
					}
				}
			}
		}

		// 3. Input Utterance, NLU Result, Response Type, Response Text, Time
		var inputTable = [];
		for (var i = 0; i < allResult.rows.length; i++) {
			inputTable.push([allResult.rows[i][1], allResult.rows[i][4], allResult.rows[i][8], allResult.rows[i][7], allResult.rows[i][2]]);
		}
		
		res.render("analyze", {
			table1: scenTable,
			table2: userTable,
			table3: inputTable
		});
	});
});

// Modify Input page
app.get('/mode', function (req, res) {
	console.log('%%% Server log: /mode ROUTER');

	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	console.log('Domain:', domain, "subdomain:", subdomain, "intention:", intention)

	/*
	var sql = "select * from SEOULCB_BLOCK";
	connection.execute(sql, function (lError, lResult, lNext) {
		if (lError) {
			console.error('SEOULCB_BLOCK access error');
			console.error(lError);
			return lError
		}

		var domainList = [];
		var subdomainList = [];
		var intentionList = [];
		for (var i = 0; i < lResult.rows.length; i++) {
			if (lResult.rows[i][0] == null) { continue }
			if (domainList.indexOf(lResult.rows[i][0]) < 0) {
				domainList.push(lResult.rows[i][0]);
			}
		}

		domainList.sort();

		// Menu List
		var menuList = [];
		for (var i = 0; i < domainList.length; i++) {
			var temp = [];
			for (var j = 0; j < lResult.rows.length; j++) {
				if (lResult.rows[j][0] === domainList[i]) {
					temp.push(lResult.rows[j][1]);
				}
			}
			temp.sort();
			menuList.push([domainList[i], temp]);
		}

		var uttSQL = 'select * from SEOULCB_INPUTS where INTENTION = :inte';
		connection.execute(uttSQL, {inte: intention}, function (inErr, inResult, inNext) {
			var uttList = [];
			if (intention.indexOf('null') < 0) {
				for (var i = 0; i < inResult.rows.length; i++) {
					uttList.push(inResult.rows[i][3]);
				}
			}

			res.render('input', {
				menuList: menuList,
				uttList: uttList,
				nowPage: [domain, subdomain]
			});
		});
	});
	*/

	var sql = "select * from SEOULCB_INPUTS";
	connection.execute(sql, function (allError, allResult) {
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
			if (allResult.rows[i][0] == null) { continue }
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {

				domainList.push(allResult.rows[i][0]);
			}
		}
		domainList.sort();

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
			temp.sort();
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
			if (allResult.rows[i][0] == null) { continue }
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {
				domainList.push(allResult.rows[i][0]);
			}
		}
		domainList.sort();

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
			temp.sort();
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
			if (allResult.rows[i][0] == null) { continue }
			if (domainList.indexOf(allResult.rows[i][0]) < 0) {
				domainList.push(allResult.rows[i][0]);
			}
		}
		domainList.sort();

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
			temp.sort();
			menuList.push([domainList[i], temp]);
		}

		var morph = '';
		if (intention.indexOf('null') < 0) {
			for (var i = 0; i < allResult.rows.length; i++) {
				if (allResult.rows[i][2] === intention) {
					morph = allResult.rows[i][3];
				}
			}
		}

		res.render('rule', {
			menuList: menuList,
			morph: morph,
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
		res.redirect('/mode?domain='+domain+'&subdomain='+subdomain);
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
			res.redirect('/mode?domain='+domain+'&subdomain='+subdomain);
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
			res.redirect('/mode?domain='+domain+'&subdomain='+subdomain);
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

	console.log("%%% Server log ::  " + intention);
	console.log("New Text: " + newText);

	//var udtSQL = "UPDATE MZCB_RESPONSE SET RES_TEXT = :resText WHERE INTENTION = :inte";
	var udtSQL = "UPDATE SEOULCB_RESPONSE SET RES_TEXT = :resText WHERE INTENTION = :inte";
	connection.execute(udtSQL, {resText: newText, inte: intention}, function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.alert('입력 에러!')
			res.redirect('/response?domain='+domain+'&subdomain='+subdomain);
		}

		console.log("%%% Server log: /updateres ROUTER :: Successfully Update [" + intention + "]  response in DB.");
		res.redirect('/response?domain='+domain+'&subdomain='+subdomain);
	});
});


// Update rule
app.post('/updaterule', function (req, res) {
	var domain = req.query.domain;
	var subdomain = req.query.subdomain;

	var intention = domain + "_" + subdomain;

	//console.log(req.body);
	var newMorph = req.body.newmorph;

	console.log("%%% Server log: /updaterule"+intention+" ROUTER");
	console.log("New Morph : " + newMorph);

	//var udtSQL = "UPDATE MZCB_RULES SET  morph1 = :m1, morph2 = :m2, morph3 = :m3 WHERE intention = :inte"
	var udtSQL = "UPDATE SEOULCB_RULES SET  morph = :m WHERE intention = :inte"
	connection.execute(udtSQL, {m:newMorph, inte:intention}, function (udtErr, udtResult, udtField) {
		if (udtErr) {
			console.error("SERVER :: DB CONNECTION ERROR :: update error");
			console.error(udtErr);
			res.end();
			return udtErr
		}

		console.log("%%% Server log: /updaterule ROUTER :: Successfully Update [" + intention + "]  rule in DB.");
		res.redirect('/rule?domain='+domain+'&subdomain='+subdomain);
	});
});