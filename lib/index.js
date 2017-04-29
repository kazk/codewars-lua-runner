"use strict";

const runner = require('@kazk/codewars-runner');
const shovel = runner.shovel;
const writeFileSync = runner.util.writeFileSync;

module.exports = function run(opts, cb) {
  const dir = '/home/codewarrior/lua';
  shovel.start(opts, cb, {
    solutionOnly(runCode) {
      runCode({
        name: 'lua',
        args: [writeFileSync(dir, 'solution.lua', opts.solution, true)]
      });
    },
    testIntegration(runCode) {
      writeFileSync(dir, 'solution.lua', opts.solution, true);
      runCode({
        name: 'busted',
        args: [
          writeFileSync(dir, 'fixture.lua', opts.fixture, true),
          `--output=codewars.lua`,
        ],
        options: {cwd: dir}
      });
    }
  });
};
