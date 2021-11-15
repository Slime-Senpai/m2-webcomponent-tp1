/* globals HTMLElement, customElements */

import { getBaseURL, getFile, stringToFormattedTime } from './lib/utils.js';

(async () => {
  const template = document.createElement('template');

  // Forced to use a fetch request because MIME text/html won't work on import
  template.innerHTML = (await getFile('./template.html', import.meta.url))
    .replace('{{cssStyle}}', '<style>' + await getFile('./template.css', import.meta.url) + '</style>');

  class SlimyProgressBar extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({ mode: 'open' });

      this.basePath = getBaseURL(import.meta.url);

      this.fixRelativePaths();

      this.setStyle();

      this.shadowRoot.appendChild(template.content.cloneNode(true));

      this.setValues();
    }

    static get observedAttributes () {
      return ['start-time', 'end-time', 'current-time'];
    }

    attributeChangedCallback (name, oldValue, newValue) {
      switch (name) {
        case 'start-time':
          this.startTime = newValue;
          this.startText.innerHTML = stringToFormattedTime(this.currentTime);
          break;
        case 'end-time':
          this.endTime = newValue;
          this.endText.innerHTML = stringToFormattedTime(this.endTime);
          break;
        case 'current-time':
          this.currentTime = newValue;
          break;
        default:
          // do nothing
      }

      this.updateWidth();
    }

    updateWidth () {
      // 0 <= percentage <= 1
      const percentage = Math.min(Math.max(this.currentTime / this.endTime - this.startTime, 0), 1);
      this.progressBar.style.width = (percentage * 100).toFixed(0) + '%';
    }

    setStyle () {
      const customStyles = document.createElement('style');

      const containerRules = [];
      const emptyBarRules = [];
      const progressBarRules = [];
      const progressDotRules = [];

      [
        // Container
        { name: 'text-color', rule: 'color', def: '#FFF', where: containerRules },
        // Empty Bar
        { name: 'background-color', rule: 'background-color', def: '#AAA', where: emptyBarRules },
        { name: 'border-width', rule: 'border-width', def: '0', where: emptyBarRules },
        { name: 'border-style', rule: 'border-style', def: 'none', where: emptyBarRules },
        { name: 'border-radius', rule: 'border-radius', def: '10px', where: emptyBarRules },
        { name: 'border-color', rule: 'border-color', def: '#0000', where: emptyBarRules },
        { name: 'width', rule: 'width', def: '500px', where: emptyBarRules },
        { name: 'height', rule: 'height', def: '20px', where: emptyBarRules },
        // Progress Bar
        { name: 'progress-color', rule: 'background-color', def: '#0000', where: progressBarRules },
        { name: 'border-radius', rule: 'border-radius', def: '10px', where: progressBarRules },
        { name: 'progress-color', rule: 'border-color', def: '#0C0', where: progressBarRules },
        { name: 'height', rule: 'height', def: '20px', where: progressBarRules },
        // Progress Dot
        { name: 'dot-color', rule: 'background-color', def: '#0F0', where: progressDotRules },
        { name: 'dot-diameter', rule: 'width', def: '25px', where: progressDotRules },
        { name: 'dot-diameter', rule: 'height', def: '25px', where: progressDotRules }
      ].forEach(({ name, rule, def, where }) => {
        const value = this.getAttribute(name);

        where.push(rule + ': ' + (value || def));
      });

      progressDotRules.push('right: -' + ((parseInt(this.getAttribute('dot-diameter')) || 25) / 2) + 'px');

      // NOTE With \n and \t just to make extra beautiful when debugging, but it could be minified

      customStyles.innerHTML += ('#container {\n\t' + containerRules.join(';\n\t') + ';\n}');

      customStyles.innerHTML += ('\n#emptyBar {\n\t' + emptyBarRules.join(';\n\t') + ';\n}');

      customStyles.innerHTML += ('\n#progressBar {\n\t' + progressBarRules.join(';\n\t') + ';\n}');

      customStyles.innerHTML += ('\n#progressBar::after {\n\t' + progressDotRules.join(';\n\t') + ';\n}');

      this.shadowRoot.appendChild(customStyles);
    }

    setValues () {
      this.startTime = this.getAttribute('start-time') || 0;
      this.endTime = this.getAttribute('end-time') || 0;
      this.currentTime = this.getAttribute('current-time') || 0;

      this.startText = this.shadowRoot.querySelector('#startTime');
      this.endText = this.shadowRoot.querySelector('#endTime');

      this.startText.innerHTML = this.currentTime;
      this.endText.innerHTML = this.endTime;

      this.progressBar = this.shadowRoot.querySelector('#progressBar');

      this.emptyBar = this.shadowRoot.querySelector('#emptyBar');

      this.emptyBar.addEventListener('mousedown', (event) => {
        this.isClicked = true;
        if (typeof this.onBarMove === 'function') {
          this.onBarMove(event, this.emptyBar.getBoundingClientRect(), this.isClicked);
        }
      });

      document.addEventListener('mouseup', (event) => {
        this.isClicked = false;
      });

      this.emptyBar.addEventListener('mousemove', (event) => {
        if (typeof this.onBarMove === 'function') {
          this.onBarMove(event, this.emptyBar.getBoundingClientRect(), this.isClicked);
        }
      });

      this.updateWidth();
    }

    fixRelativePaths () {
      // change webaudiocontrols relative paths for spritesheets to absolute
      template.content.querySelectorAll('*[src]').forEach((e) => {
        const currentPath = e.getAttribute('src');
        if (currentPath !== undefined && currentPath.startsWith('.')) {
          e.setAttribute('src', this.basePath + currentPath);
        }
      });

      template.content.querySelectorAll('*[href]').forEach((e) => {
        const currentPath = e.getAttribute('href');
        if (currentPath !== undefined && currentPath.startsWith('.')) {
          e.setAttribute('href', this.basePath + currentPath);
        }
      });
    }
  }

  customElements.define('sl1-progressbar', SlimyProgressBar);
})();
