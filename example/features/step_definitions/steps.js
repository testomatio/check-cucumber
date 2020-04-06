const assert = require('assert');

var {defineSupportCode} = require('cucumber');

defineSupportCode(function({Given, When, Then}) {

  Given('I have a defined step', () => {
    a = 1;
    assert(a === 1);
  });
  
  Given('Open google', () => {
    assert(true === true);
  });
  
  Given('I open GitHub', () => {
    assert('a' === 'a');
  });

  Given('I have a defined step 2', () => {
    a = 1;
    assert(a === 1);
  });
  
  Given('I open GitHub 2', () => {
    assert('a' === 'a');
  });

});