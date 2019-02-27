module.exports = {
	user			: process.env.NODE_ORACLEDB_USER || "mzen",
	password		: process.env.NODE_ORACLEDB_PASSWORD || "mediazen",
	connectString	: process.env.NODE_ORACLEDB_CONNECTIONSTRING || "192.168.123.31/xe",
	externalAuth	: process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false
};