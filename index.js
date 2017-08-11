/**
 * gulp-forward
 * @author: LanceLou
 * @version: 1.0.0
 * 
 * use with gulp-connect dev server(as middleware)
 */

const fs = require('fs');
var httpProxy = require('http-proxy');
const chalk = require('chalk');
const moment = require('moment');
const proxy = httpProxy.createProxyServer({});
const logPreStr = `-${chalk.green('gfw')}->`;
const log = console.log;


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

/**
 * find the url matched rule(else return null)
 * @param {*} rules the config rules
 * @param {*} url the request url
 */
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

const printLog = (from, to) => {
  const timeStr = `[${moment().format('HH:mm:ss')}]`;
  log(chalk.white(`${logPreStr}${chalk.gray(timeStr)} Forward from 127.0.0.1 ${chalk.hex('#05E4F3')('to')} 10:23:22:180`));
};

/**
 * remote api request forward
 * @param {*} config
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const remoteProxy = (config, req, res, next) => {
  proxy.on('error', (err, req, res) => {
    try {
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      log(chalk.red(`${logPreStr} Error url: ${req.headers.host}/${req.url}`));
      res.end(err);
    } catch (e) {
      log(chalk.red(`${logPreStr} Error ${e}`));
    }
  });

  let url = req.url;
  let remoteUrl = `${config.remoteUrl}:${config.remotePort}`;
  const rule = getMatchedRule(config.rules, url);
  if (rule) { // matched: request to local
    var targetUrl = url.replace(rule.reg, rule.replace);
    req.url = targetUrl;
    next();
  } else { // unmatched: forward to remote
    remoteUrl += url;
    printLog(`${req.headers.host}/${req.url}`, remoteUrl);
    proxy.web(req, res, {
      target: remoteUrl,
      prependPath: false,
    }, (err) => {
      log(chalk.red(`${logPreStr} Error ${err}`));
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
  url = url.split('?')[0];
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
