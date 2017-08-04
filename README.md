# gulp-forward
gulp FED test middleware，script local，data remote！


## Installation

Using npm:

```bash
$ npm i --save-dev gulp-forward
```

Config in gulpfile.js

* First, you need use gulp with gulp-connect as you local dev server。
* Then, Config something, that's depend on your project！

Example(In our project, we config like this below):


**dev mock server**:

```JavaScript
{
  proxyOpt: 1,
  mockConfig: {
    mockDir: `${__dirname}/test/frontEnd/`,
    mockReg: /\/xhr(\/[\w.]+)+$/,
  },
}
```


**test remote forward**

***the rules regexp is design to intercept the rquest and forward to local server(the gulp server), otherwise, the request will be proxy to remote server***

```JavaScript
{
  proxyOpt: 2,
  remoteUrl: 'http://miq.lancelou.com',
  remotePort: 80,
  rules: [
    {
      reg: /(\/js\/\w*)-.*(\.js)$/,
      replace: '$1$2',
    },
    {
      reg: /(\/js\/.*\.js.map)$/,
      replace: '$1',
    },
  ],
}
```