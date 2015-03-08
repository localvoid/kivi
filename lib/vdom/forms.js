'use strict';

var vdom = require('../vdom');

function _initValue(data) {
  if (data != null) {
    this.value = data;
  }
}

function _updateValue(oldData, newData) {
  if (this.value != newData) {
    this.value = newData;
  }
}

function _initChecked(data) {
  if (data != null) {
    this.checked = data;
  }
}

function _updateChecked(oldData, newData) {
  if (this.checked != newData) {
    this.checked = newData;
  }
}

var TextInput = vdom.declareElement({
  tag: 'input',
  init: function(data) {
    this.type = 'text';
    _initValue.call(this, data);
  },
  update: _updateValue
});

var PasswordInput = vdom.declareElement({
  tag: 'input',
  init: function(data) {
    this.type = 'password';
    _initValue.call(this, data);
  },
  update: _updateValue
});

var CheckBox = vdom.declareElement({
  tag: 'input',
  init: function(data) {
    this.type = 'checkbox';
    _initChecked.call(this, data);
  },
  update: _updateChecked
});

module.exports = {
  TextInput: TextInput,
  PasswordInput: PasswordInput,
  CheckBox: CheckBox
};
