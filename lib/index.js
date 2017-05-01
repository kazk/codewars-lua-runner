"use strict";

const path = require('path');
const fs = require('fs-extra');

const runner = require('@kazk/codewars-runner');
const shovel = runner.shovel;

module.exports = function run(opts) {
  return shovel.start(opts, {
    solutionOnly(runCode) {
      const solution = path.join(opts.dir, 'solution.lua');
      fs.outputFileSync(solution, opts.solution);
      runCode({
        name: 'lua',
        args: [solution],
        options: {cwd: opts.dir}
      });
    },
    testIntegration(runCode) {
      const fixture = path.join(opts.dir, 'fixture.lua');
      fs.outputFileSync(path.join(opts.dir, 'solution.lua'), opts.solution);
      fs.outputFileSync(fixture, opts.fixture);
      runCode({
        name: 'busted',
        args: [
          fixture,
          `--output=/runner/lua/codewars.lua`,
        ],
        options: {cwd: opts.dir}
      });
    }
  });
};
