// Bug in import order: https://github.com/evanw/esbuild/issues/399
/* global require */
require('../../features/beta-program/controllers/beta-program-participate')
require('../../main')
