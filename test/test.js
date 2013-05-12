var async = require('async'),
    parser = require('../parser.js').parser,
    ast = require('../src/ast.js'),
    lol = require('../src/lol.js');

/**
 * This is a set of end to end tests of the system.
 * The tests here start with some lolcode, execute it, and look
 * at the response. They don't, for example, do any granular testing of the parser.
 */

global.ast = ast;

function t_(expected, expression, test, done) {
    var tree = parser.parse(expression);
    var l = new lol(function(response) {
        test.strictEqual(response, expected);
        done();
    });
    l.evaluate(tree);
}

function t(expected, expression, test) {
    var args = Array.prototype.slice.call(arguments);

    return function(cb) {
        t_(expected, expression, test, cb);
    }
}

exports.testComments = function(test) {
    async.series([
        t(true, 'WIN BTW this is a comment', test),
        t(true, 'BTW this is a comment\nWIN', test),
        t(true, 'OBTW this is a comment\nWIN still a comment...\nTLDR WIN', test),
        t(true, 'OBTW this is a comment\nWIN still a comment...\nTLDR\nWIN', test)
    ], function() {
        test.done();
    });
}

exports.testPrimitives = function(test) {
    async.series([
        t(true, 'WIN', test),
        t(false, 'FAIL', test),
        t(null, 'NOOB', test),
        t(5, '5', test),
        t("HELLO", '"HELLO"', test),
        t("HELLO", "'HELLO'", test),
    ], function() {
        test.done();
    });
};

exports.testEscapeSequences = function(test) {
    async.series([
        t('I said "hello" to him', '"I said :"hello:" to him"', test),
        // unicode
        t('I like π', '"I like :(03C0)"', test),
    ], function() {
        test.done();
    });
}

exports.testOperators = function(test) {
    async.series([
        t(3, 'SUM OF 1 AN 2', test),
        t('12', 'SUM OF "1" AN 2', test),

        t(4, 'DIFF OF 8 AN 4', test),
        t(true, 'BOTH SAEM 1 AN 1', test),
        t(true, 'BOTH SAEM "1" AN "1"', test),
        t(true, 'BOTH SAEM WIN AN WIN', test),
        t(false, 'BOTH SAEM 1 AN 2', test),
        t(false, 'BOTH SAEM "1" AN 1', test),
        t(false, 'BOTH SAEM WIN AN FAIL', test),

        t('S1', 'SMOOSH "S1" MKAY', test),
        t('S1S2', 'SMOOSH "S1" AN "S2" MKAY', test),
        t('S1 S2', 'SMOOSH "S1" AN " " AN "S2" MKAY', test),

        // non string primitives should get rewritten nicely.
        t('WIN', 'SMOOSH WIN MKAY', test),
        t('FAIL', 'SMOOSH FAIL MKAY', test),
        t('NOOB', 'SMOOSH NOOB MKAY', test),

        t(true, '1 SMALLR THAN 2', test),
        t(false, '2 SMALLR THAN 1', test),
        t(false, '1 BIGGR THAN 2', test),
        t(true, '2 BIGGR THAN 1', test),

        // check the nesting.
        t(3, 'SUM OF DIFF OF 5 AN 4 AN 2', test),
        // Brackets don't do anything, but they can make it clearer.
        t(3, 'SUM OF (DIFF OF 5 AN 4) AN 2', test),

        t(true, 'ANY OF 6 AN 2 AN 3 AN 4 MKAY', test),
    ], function() {
        test.done();
    });
};


exports.testMultiLine = function(test) {
    async.series([
        t(3,  'SUM OF 3 AN 4\n' + 'DIFF OF 7 AN 4\n', test)
    ], function() {
        test.done();
    });
}

exports.testAssignment = function(test) {
    async.series([
        t(15, 'I HAS A x ITZ 15\nx', test),
        t(15, 'I HAS A x ITZ SUM OF 5 AN 10\nx', test),
        t(15, 'I HAS A x\nx R 15\nx', test)
    ], function() {
        test.done();
    });
}


exports.testConditional = function(test) {
    async.series([
        t(15, [
            'I HAS A x ITZ WIN',
            'I HAS A y',
            'x, O RLY?',
            '  YA RLY',
            '    y R 15',
            '  NO WAI',
            '    y R 20',
            'OIC',
            'y'
            ].join('\n'), test),
        t(20, [
            'I HAS A x ITZ FAIL',
            'I HAS A y',
            'x, O RLY?',
            '  YA RLY',
            '    y R 15',
            '  NO WAI',
            '    y R 20',
            'OIC',
            'y'
        ].join('\n'), test),
        t(17, [
            'I HAS A x ITZ FAIL',
            'I HAS A y',
            'x, O RLY?',
            '  YA RLY',
            '    y R 15',
            '  MEBBE BOTH SAEM FAIL AN x',
            '    y R 17',
            '  NO WAI',
            '    y R 20',
            'OIC',
            'y'
        ].join('\n'), test),
        t(28,
        // let's check it nests properly. We should hit the NO WAI of the
        // MEBBE.
            [
            'I HAS A x ITZ FAIL',
            'I HAS A y',
            'x, O RLY?',
            '  YA RLY',
            '    y R 15',
            '  MEBBE BOTH SAEM FAIL AN x',
            '      x, O RLY?, YA RLY',
            '         y R 25',
            '      NO WAI',
            '         y R 28',
            '      OIC',
            '  NO WAI',
            '    y R 20',
            'OIC',
            'y'
        ].join('\n'), test)
    ], function() {
        test.done();
    });
}

exports.testLoops = function(test) {
    var e1 = [
        'I HAS A COUNTER ITZ 0',
        'IM IN YR LOOP UPPIN YR COUNTER WILE COUNTER SMALLR THAN 10',
        '  O NVM',
        'IM OUTTA YR LOOP',
        'COUNTER',
    ].join('\n');
    var e2 = [
        'I HAS A COUNTER ITZ 5',
        'I HAS A LOOP_COUNTER ITZ 0',
        'IM IN YR LOOP UPPIN YR COUNTER WILE COUNTER SMALLR THAN 10',
        '  LOOP_COUNTER R SUM OF LOOP_COUNTER AN 1',
        'IM OUTTA YR LOOP',
        'LOOP_COUNTER',
    ].join('\n');

    async.series([
        t(10, e1, test),
        t(5, e2, test)
    ], function() {
        test.done();
    });
}

exports.testFuncDefs = function(test) {
    var e1 = [
        'HOW DUZ I ADD YR NUM1 AN YR NUM2',
        '  SUM OF NUM1 AN NUM2',
        'IF U SAY SO',
        '',
        '',
        'ADD 5 AN 3 MKAY'
    ].join('\n');
    var e2 = [
        'HOW DUZ I PI',
        '  3.14159',
        'IF U SAY SO',
        '',
        '',
        'PI'
    ].join('\n')

    async.series([
        t(8, e1, test),
        t(3.14159, e2, test)
    ], function() {
        test.done()
    });
}

exports.testCast = function(test) {
    var setup = 'I HAS A NUM ITZ 12\n';
    async.series([
        t(12, setup + 'NUM', test),
        t('12', setup + 'NUM2 R MAEK NUM A YARN\nNUM2', test),
        t(true, setup + 'NUM2 R MAEK NUM A TROOF\nNUM2', test),
        t(null, setup + 'NUM2 R MAEK NUM A NOOB\nNUM2', test),

        t(12, setup + 'NUM IS NOW A NUMBAR\nNUM', test),
        t(true, setup + 'NUM IS NOW A TROOF\nNUM', test),
        t(null, setup + 'NUM IS NOW A NOOB\nNUM', test),
        t('12', setup + 'NUM IS NOW A YARN\nNUM', test)
    ], function() {
        test.done();
    });
}