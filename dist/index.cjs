
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./rn-disk-cache.production.min.cjs')
} else {
  module.exports = require('./rn-disk-cache.development.cjs')
}
