module.exports = (function () {
    return {
      local: { // localhost
        //host: '192.168.123.237',
        host: 'localhost',
        user: 'hmc',
        password: 'aleldjwps',
        database: 'hmc_chatbot'
      },
      real: { // real server db info
        host: '',
        port: '',
        user: '',
        password: '!',
        database: ''
      },
      dev: { // dev server db info
        host: '',
        port: '',
        user: '',
        password: '',
        database: ''
      }
    }
  })();