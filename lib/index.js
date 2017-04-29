"use strict";

const runner = require('@kazk/codewars-runner');
const shovel = runner.shovel;
const writeFileSync = runner.util.writeFileSync;

module.exports = function run(opts, cb) {
  shovel.start(opts, cb, {
    solutionOnly(runCode) {
      runCode({
        name: 'lua',
        args: [writeFileSync(opts.dir, 'solution.lua', opts.solution, true)]
      });
    },
    testIntegration(runCode) {
      writeFileSync(opts.dir, 'solution.lua', opts.solution, true);
      runCode({
        name: 'busted',
        args: [
          writeFileSync(opts.dir, 'fixture.lua', opts.fixture, true),
          `--output=/runner/lua/codewars.lua`,
        ],
        options: {cwd: opts.dir}
      });
    }
  });
};
