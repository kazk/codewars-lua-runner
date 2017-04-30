"use strict";

const fs = require('fs');

const expect = require('chai').expect;
const yaml = require('js-yaml');
const WritableStreamBuffer = require('stream-buffers').WritableStreamBuffer;

const Docker = require('dockerode');
const docker = new Docker();

describe('lua runner', function() {
  it('should handle basic code evaluation', function(done) {
    run({
      format: 'json',
      code: 'print(42)'
    }).then(function(buffer) {
      expect(buffer.stdout).to.equal('42\n');
      expect(buffer.exitCode).to.equal(0);
      showBuffer(buffer);
      done();
    });
  });
});

describe('busted', function() {
  it('should handle basic code assertion', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  return a + b
end
return kata
`,
      fixture: `
local kata = require 'solution'
describe("add", function()
  it("should add numbers", function()
    assert.are.same(2, kata.add(1, 1))
  end)
end)
`
    }).then(function(buffer) {
      expect(buffer.stdout).to.contain('<PASSED::>');
      expect(buffer.stderr).to.equal('');
      showBuffer(buffer);
      done();
    });
  });

  it('should handle basic code assertion failure', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  return a - b
end
return kata
`,
      fixture: `
local kata = require 'solution'
describe("add", function()
  it("should add numbers", function()
    assert.are.same(2, kata.add(1, 1))
  end)
end)
`
    }).then(function(buffer) {
      expect(buffer.stdout).to.contain('<FAILED::>');
      showBuffer(buffer);
      done();
    });
  });

  it('should handle mixed success and failure', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  return a - b
end
return kata
`,
      fixture: `
local kata = require 'solution'
describe("add", function()
  it("should add numbers", function()
    assert.are.same(0, kata.add(0, 0))
  end)
  it("should add numbers", function()
    assert.are.same(2, kata.add(1, 1))
  end)
end)
`
    }).then(function(buffer) {
      expect(buffer.stdout).to.contain('<PASSED::>');
      expect(buffer.stdout).to.contain('<FAILED::>');
      showBuffer(buffer);
      done();
    });
  });

  it('should handle error', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  error("Error")
  return a - b
end
return kata
`,
      fixture: `
local kata = require 'solution'
describe("add", function()
  it("should add numbers", function()
    assert.equal(2, kata.add(1, 1))
  end)
end)
`
    }).then(function(buffer) {
      expect(buffer.stdout).to.contain('<ERROR::>');
      expect(buffer.stdout).to.contain('./solution.lua:4: Error');
      showBuffer(buffer);
      done();
    });
  });

  it('should output nested describes', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  return a + b
end
return kata
`,
      fixture: `
-- from busted website
describe("Busted unit testing framework", function()
  describe("should be awesome", function()
    it("should be easy to use", function()
      assert.truthy("Yup.")
    end)

    it("should have lots of features", function()
      assert.are.same({ table = "great"}, { table = "great" })
      assert.are_not.equal({ table = "great"}, { table = "great"})
      assert.truthy("this is a string")
      assert.True(1 == 1)
      assert.is_true(1 == 1)
      assert.falsy(nil)
      assert.has_error(function() error("Wat") end, "Wat")
    end)

    it("should provide some shortcuts to common functions", function()
      assert.are.unique({{ thing = 1 }, { thing = 2 }, { thing = 3 }})
    end)

    it("should have mocks and spies for functional tests", function()
      local kata = require 'solution'
      spy.on(kata, "add")
      kata.add(1, 1)
      assert.spy(kata.add).called()
      assert.spy(kata.add).called_with(1, 1)
    end)
  end)
end)
`
    }).then(function(buffer) {
      const nested = [
        '<DESCRIBE::>',
        '  <DESCRIBE::>',
        '    <IT::><PASSED::><COMPLETEDIN::>',
        '    <IT::><PASSED::><COMPLETEDIN::>',
        '    <IT::><PASSED::><COMPLETEDIN::>',
        '    <IT::><PASSED::><COMPLETEDIN::>',
        '  <COMPLETEDIN::>',
        '<COMPLETEDIN::>'
      ].join('').replace(/\s/g, '');
      expect(buffer.stdout.match(/<(?:DESCRIBE|IT|PASSED|COMPLETEDIN)::>/g).join('')).to.equal(nested);
      showBuffer(buffer);
      done();
    });
  });

  it('should allow solution to log', function(done) {
    run({
      format: 'json',
      solution: `
local kata = {}
function kata.add(a, b)
  print(a)
  print(b)
  return a + b
end
return kata
`,
      fixture: `
require 'busted.runner'()
local kata = require 'solution'

describe("add", function()
  it("should add numbers", function()
    assert.are.same(3, kata.add(1, 2))
  end)
end)
`
    }).then(function(buffer) {
      expect(buffer.stdout).to.contain('<PASSED::>');
      expect(buffer.stdout).to.contain('1');
      expect(buffer.stdout).to.contain('2');
      showBuffer(buffer);
      done();
    });
  });
});


describe('Example Challenges', function() {
  const examples = yaml.safeLoad(fs.readFileSync(__dirname + '/fixtures/busted_examples.yml', 'utf8'));
  if (!examples) return;

  for (const name of Object.keys(examples)) {
    const example = examples[name];
    it('should define an initial code block', function() {
      expect(example.initial).to.be.a('string');
    });

    it('should have a passing ' + name + ' example', function(done) {
      run({
        format: 'json',
        testFramework: 'busted',
        setup: example.setup,
        code: example.answer,
        fixture: example.fixture,
      }).then(function(buffer) {
        expect(buffer.stdout).to.not.contain('<FAILED::>');
        expect(buffer.stdout).to.not.contain('<ERROR::>');
        showBuffer(buffer);
        done();
      });
    });
  }
});


function run(opts) {
  // shovel.js: MAX_BUFFER=1500*1024, MAX_DATA_BUFFER=50*1024
  const out = new WritableStreamBuffer({
    initialSize: 500 * 1024,
    incrementAmount: 50 * 1024
  });
  return docker.run('cw/lua-runner', ['run-json', JSON.stringify(opts)], out)
  .then(function(container) {
    container.remove();
    out.end();
    return JSON.parse(out.getContentsAsString('utf8'));
  })
  .catch(function(err) {
    console.log(err);
  });
}

function showBuffer(buffer) {
  if (buffer.stdout != '') {
    process.stdout.write('-'.repeat(32) + ' STDOUT ' + '-'.repeat(32) + '\n');
    process.stdout.write(buffer.stdout);
    process.stdout.write('-'.repeat(72) + '\n');
  }

  if (buffer.stderr != '') {
    process.stdout.write('-'.repeat(32) + ' STDERR ' + '-'.repeat(32) + '\n');
    process.stdout.write(buffer.stderr);
    process.stdout.write('-'.repeat(72) + '\n');
  }
}
