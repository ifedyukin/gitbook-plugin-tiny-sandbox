var tinySandbox = (function () {
  var CONFIG = {
    id: {
      length: 5,
      prefix: 'tiny-sandbox-',
      alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    },
    debounce: 500,
    prefix: 'sandbox-',
    syntaxError: 'Syntax error!'
  };

  var RUN_HISTORY = {};
  var RENDERED_LIST = [];

  var TYPES = {
    SYNTAX_ERROR: 'syntax-error',
    CONTAINER: 'tiny-sandbox',
    CONSOLE: 'console',
    BUTTON: 'button',
    BOX: 'sandbox',
    HTML: 'html',
    CSS: 'css',
    JS: 'js'
  };

  var STYLES = {
    SYNTAX_ERROR: {
      color: 'red'
    }
  };

  function appendStyle(block, styles) {
    if (!block) return;
    Object.keys(styles).forEach(function(style) {
      block.style[style] = styles[style];
    });
  }

  function genId() {
    var text = '';
    var possible = CONFIG.id.alphabet;
    for (var i = 0; i < CONFIG.id.length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return CONFIG.id.prefix + text;
  }

  function getSandboxElementByClass(id, className) {
    return document.querySelector('#' + id + '>.' + className);
  }

  function valueGetter(id) {
    return function (type) {
      var element = getSandboxElementByClass(id, 'sandbox-' + type);
      return element ? element.value : '';
    }
  }

  function argumentsToString(arguments) {
    var length = arguments.length;
    var result = '';
    for (var i = 0; i < length; i++) {
      var active = arguments[i];
      if (typeof active === 'object') {
        active = JSON.stringify(active);
      }
      result += active + (i === length - 1 ? '' : ', ');
    }
    return result;
  }

  function logger(id) {
    var output = getSandboxElementByClass(id, TYPES.CONSOLE);
    var result = {};
    Object.keys(window.console)
      .forEach(function (key) {
        result[key] = function () {
          var message = document.createElement('p');
          message.innerText = '[' + key + ']' + argumentsToString(arguments);
          output.appendChild(message);
        }
      });
    return result;
  }

  function successRun(id) {
    RUN_HISTORY[id] = true;
  }

  function failureRun(id) {
    RUN_HISTORY[id] = false;
  }

  function isFailedRun(id) {
    return !RUN_HISTORY[id];
  }

  function debounce(func) {
    var timer;
    return function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        clearTimeout(timer);
        func();
      }, CONFIG.debounce);
    }
  }

  function renderEditorArea(id) {
    var block = document.querySelector('#' + id);
    var getInner = valueGetter(id);

    var css = getInner(TYPES.CSS);
    var html = getInner(TYPES.HTML);
    var js = getInner(TYPES.JS)
      .replace('console', 'window.parent.tinySandbox.logger("' + id + '")');

    var runButton = getSandboxElementByClass(id, TYPES.BUTTON);
    if (!runButton) {
      runButton = document.createElement('button');
      runButton.className = TYPES.BUTTON;
      runButton.innerHTML = 'Run';
      runButton.onclick = function() {
        renderEditorArea(id);
      };
      block.appendChild(runButton);
    }

    var errorMessage = getSandboxElementByClass(id, TYPES.SYNTAX_ERROR);
    if (!errorMessage) {
      errorMessage = document.createElement('div');
      errorMessage.className = TYPES.SYNTAX_ERROR;
      errorMessage.innerHTML = CONFIG.syntaxError;
      errorMessage.style.display = 'none';
      appendStyle(errorMessage, STYLES.SYNTAX_ERROR);
      block.appendChild(errorMessage);
    }

    var sandbox = getSandboxElementByClass(id, TYPES.BOX);
    if (!sandbox) {
      sandbox = document.createElement('iframe');
      sandbox.className = TYPES.BOX;
      block.appendChild(sandbox);
      sandbox.onload = function() {
        if (isFailedRun(id)) {
          errorMessage.style.display = 'block';
        } else {
          errorMessage.style.display = 'none';
        }
      };
    }

    var consoleOutput = getSandboxElementByClass(id, TYPES.CONSOLE);
    if (!consoleOutput) {
      consoleOutput = document.createElement('div');
      consoleOutput.className = TYPES.CONSOLE;
      block.appendChild(consoleOutput);
    }

    failureRun(id);
    sandbox.srcdoc =
      '<style>' + css + '</style>' +
      '<body>' +
      html +
      '<script>' +
      'try {' +
        js +
        ';window.parent.tinySandbox.success("' + id + '");' +
      '} catch(e) {' +
        'window.parent.tinySandbox.logger("' + id + '").error(e);' +
        'window.parent.tinySandbox.success("' + id + '");' +
      '}' +
      '</script>' +
      '</body>';
  }

  function setAttributes(block, id) {
    if (!block.id) block.setAttribute('id', id);
    block.setAttribute('autocorrect', 'off');
    block.setAttribute('spellcheck', 'false');
    block.setAttribute('autocapitalize', 'off');
  }

  function initSandbox() {
    document
      .querySelectorAll('.' + TYPES.CONTAINER)
      .forEach(function (block) {
        if (RENDERED_LIST.indexOf(block.id) !== -1) return;

        var editorId = block.id || genId();
        setAttributes(block, editorId);

        RENDERED_LIST.push(editorId);
        renderEditorArea(editorId);

        [TYPES.HTML, TYPES.CSS]
          .forEach(function (type) {
            getSandboxElementByClass(editorId, CONFIG.prefix + type)
              .addEventListener(
                'input',
                debounce(function () { renderEditorArea(editorId); })
              );
          });
      });
  }

  window.addEventListener('DOMContentLoaded', initSandbox);
  initSandbox();

  return {
    logger: logger,
    success: successRun
  }
})();
