#!/usr/bin/env node
'use strict';

const { NODE_ENV } = process.env;
if (NODE_ENV === 'production')
  module.exports = require('./rn-disk-cache.production.min.cjs');
else
  module.exports = require('./rn-disk-cache.development.cjs');
