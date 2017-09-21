'use strict';

module.exports = {
  context: __dirname,
  target: 'node',
  entry: ['./bin.js'],
  output: {
    filename: 'glslify.js'
  }
};
