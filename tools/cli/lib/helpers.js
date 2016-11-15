'use strict';

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const inout = require('./inout');
const colors = require('colors/safe');

const nameCases = {};

_.pascalCase = _.flow(_.camelCase, _.upperFirst);

module.exports = {
  getProjectRoot() {
    return path.join(__dirname, '../../../');
  },

  ensurePathDir(fullPath) {
    if (!shell.test('-e', path.dirname(fullPath))) {
      shell.mkdir('-p', path.dirname(fullPath));
    }
  },

  ensureDir(dir) {
    if (!shell.test('-e', dir)) {
      shell.mkdir('-p', dir);
    }
  },

  ensureFile(filePath, templateFile) {
    if (!shell.test('-e', filePath)) {
      if (templateFile) shell.cp(templateFile, filePath);
      else shell.ShellString('').to(filePath);
    }
  },

  pascalCase: _.flow(_.camelCase, _.upperFirst),

  createFromTemplate(feature, name, tpl) {
    const cases = this.nameCases(name);
    const context = Object.assign({}, cases, {});
    const targetPath = this.mapName(feature, name) + '.js';
    inout.save(targetPath, this.handleTemplate(tpl, context));
  },

  readTemplate(name) {
    return shell.cat(path.join(__dirname, '../templates', name)).replace(/\r/g, '');
  },

  processTemplate(tpl, data) {
    const compiled = _.template(tpl);
    return compiled(data);
  },

  handleTemplate(name, context) {
    const compiled = _.template(this.readTemplate(name));
    return compiled(context);
  },

  getLines(filePath) {
    if (_.isArray(filePath)) return filePath;
    return shell.cat(filePath).split('\n').map(line => line.replace(/\r/g, ''));
  },

  removeLines(lines, str) {
    _.remove(lines, line => this.isStringMatch(line, str));
  },

  addImportLine(lines, importLine) {
    const i = this.lastLineIndex(lines, /^import /);
    lines.splice(i + 1, 0, importLine);
  },

  removeImportLine(lines, modulePath) {
    this.removeLines(lines, new RegExp(`import .+ from '${modulePath}';`));
  },

  addNamedExport(lines, name) {
    const i = this.lastLineIndex(lines, /^\};/);
    lines.splice(i, 0, `  ${name},`);
  },

  removeNamedExport(lines, name) {
    console.log('Removing named export: ', name);
    this.removeLines(lines, `  ${name},`);
  },

  addConstant(lines, name) {
    if (lines.length && !lines[lines.length - 1]) lines.pop();
    lines.push(`export const ${name} = '${name}';`);
    lines.push('');
  },

  removeConstant(lines, name) {
    this.removeLines(lines, `export const ${name} = '${name}';`);
  },

  isStringMatch(str, pattern) {
    if (typeof pattern === 'string') {
      return _.includes(str, pattern);
    } else if (_.isFunction(pattern)) {
      return pattern(str);
    }
    return pattern.test(str);
  },

  lineIndex(lines, str, fromIndex) {
    if (typeof str === 'string') {
      return _.findIndex(lines, l => l.indexOf(str) >= 0, fromIndex || 0);
    } else if (_.isFunction(str)) {
      return _.findIndex(lines, str);
    }
    return _.findIndex(lines, l => str.test(l), fromIndex || 0);
  },

  lastLineIndex(lines, str) {
    if (typeof str === 'string') {
      return _.findLastIndex(lines, l => l.indexOf(str) >= 0);
    } else if (_.isFunction(str)) {
      return _.findLastIndex(lines, str);
    }
    return _.findLastIndex(lines, l => str.test(l));
  },

  // getToSave(filesToSave) {
  //   return function toSave(filePath, fileContent) {
  //     filesToSave.push({
  //       path: filePath,
  //       content: _.isArray(fileContent) ? fileContent.join('\n') : fileContent,
  //     });
  //   };
  // },

  // saveFiles(files) {
  //   console.log('Save files');
  //   files.forEach((file) => {
  //     shell.ShellString(file.content).to(file.path);
  //   });
  // },

  splitName(name, obj) {
    // map "feature/name" to obj {feature: xx, name: yy}
    const arr = name.split('/');
    obj.feature = arr[0];
    obj.name = arr[1];
  },

  mapName(feature, name) {
    // Map a component, page name to the file.
    return this.mapFile(feature, _.pascalCase(name));
  },

  mapFile(feature, fileName) {
    return path.join(this.getProjectRoot(), 'src/features', _.kebabCase(feature), fileName);
  },

  getTestFile(feature, name) {
    // Map a component, page name to the test file.
    return this.mapTestFile(feature, _.pascalCase(name) + '.test.js');
  },

  mapTestFile(feature, fileName) {
    return path.join(this.getProjectRoot(), 'test/app/features', _.kebabCase(feature), fileName);
  },

  nameCases(name) {
    if (!nameCases[name]) {
      nameCases[name] = {
        PASCAL: _.pascalCase(name),
        KEBAB: _.kebabCase(name),
        CAMEL: _.camelCase(name),
        SNAKE: _.snakeCase(name),
      };
    }

    return nameCases[name];
  },

  fatalError(msg) {
    console.log(colors.red('Error: ' + msg));
    process.exit(1);
  }
};
