/**
 * gulp-forward
 * @author: LanceLou
 * @version: 1.0.0
 * 
 * use with gulp-connect dev server(as middleware)
 * 
 * 只拦截，也只能拦截到127.0.0.1 host
 * 目标: 静态文件放行(走本地静态文件，如html，js，css等)
 * -> API请求 -> 需配置转发flag，即mockData还是remote API(config.proxyOpt: 1: mock, 2: remote)
 * 
 * 转发1: 走remote接口 转发2：读取本地mock文件，mock-data(规则单一哈)
 * 
 * config.remote: String
 * config.rule: Array@{}
 * config.exclude: String(排除规则，比如首页请求放行 -> 毕竟单页面，用来设置token)
 */

const fs = require('fs');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});


/**
 * gulpForward: middleware entry
 *
 * @param {Object} config object
 * @param {String} [config.remoteUrl] proxy -> remote server url
 * @param {String} [config.remotePort] proxy -> remote server port
 * @param {Number} [config.proxyOpt] proxy -> proxy type: mock(1) or remote(2)
 * @param {Number} [config.mockConfig] mock server config(when proxytype 1)
 * @param {Number} [config.mockConfig.mockDir] proxy -> mock proxy addr(absolute)
 * @param {Number} [config.mockConfig.mockReg] proxy -> mock proxy regExp
 * @param {Array} [config.rules] proxy -> rule
 * @param {Array} [config.rules.reg] reg to replace the request url
 * @param {Array} [config.rules.replace] String to replace the request url
 */
const gulpForward = (config) => (req, res, next) => {
  if (config.proxyOpt === 2 && (!new Number(config.proxyOpt) || !config.remoteUrl || !config.remotePort)) {
    throw new Error('Error Params, see github. (gulp-forward)');
  }
  if (config.proxyOpt === 1) {
    mockProxy(config.mockConfig, req, res, next);
  } else if (config.proxyOpt === 2) {
    remoteProxy(config, req, res, next);
  } else {
    next();
  }
};

const getMatchedRule = (rules, url) => {
  let rule = null;
  rules.find((curRule) => {
    if (curRule.reg.test(url)) {
      rule = curRule;
      return true;
    }
  });
  return rule;
};

/**
 * remote api request forward
 * @param {*} config
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const remoteProxy = (config, req, res, next) => {
  // 异常捕获
  proxy.on('error', (err, req, res) => {
    try {
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });

      console.log(`error url: ${req.headers.host}/${req.url}`);
      res.end(err);
    } catch (e) {
      clear();
      console.log(e);
    }
  });

  let url = req.url;
  let remoteUrl = `${config.remoteUrl}:${config.remotePort}`;
  // 检查url是否匹配，不匹配直接放行
  const rule = getMatchedRule(config.rules, url);
  if (rule) {
    // 匹配剩下，返回匹配生成的matchUrl & 拼接原remote server addr 与 matchUrl
    var targetUrl = url.replace(rule.reg, rule.replace);
    req.url = targetUrl;
    console.log(targetUrl);
    next();
  } else {
    // 未匹配，请求远程
    remoteUrl += url;
    console.log(remoteUrl);
    console.log(url);
    // 进行代理
    proxy.web(req, res, {
      target: remoteUrl,
      prependPath: false,
    }, (err, data) => {
      console.log(data);
    });
  }
};

/**
 * local mock proxy
 * @param {*} config the mock server config
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const mockProxy = (config ,req, res, next) => {
  let url = req.url;
  console.log(url);
  if (config.mockReg.test(url)) {
    const curPath = `${config.mockDir}${url}`;
    let body = '';
    let status = 404;
    fs.exists(curPath, (exists) => {
      if (exists) {
        body = fs.readFileSync(curPath, 'utf8');
        status = 200;
      } else {
        body = 'api handler no find';
      }
      res.writeHead(status, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(body);
    });
  } else {
    // pass it
    next();
  }
};

module.exports = gulpForward;
