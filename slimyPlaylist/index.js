/* globals HTMLElement, customElements */

import { getBaseURL, getFile } from './lib/utils.js';

(async () => {
  const template = document.createElement('template');

  // Forced to use a fetch request because MIME text/html won't work on import
  template.innerHTML = (await getFile('./template.html', import.meta.url))
    .replace('{{cssStyle}}', '<style>' + await getFile('./template.css', import.meta.url) + '</style>');

  class SlimyPlaylist extends HTMLElement {
    constructor () {
      super();
      this.attachShadow({ mode: 'open' });

      this.basePath = getBaseURL(import.meta.url); // url absolu du composant
      // Fix relative path in WebAudio Controls elements

      this.fixRelativePaths();

      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    static get observedAttributes () {
      return ['next', 'previous'];
    }

    attributeChangedCallback (name, oldValue, newValue) {
      switch (name) {
        case 'next':
          if (!this.hasAttribute('next')) return;
          this.removeAttribute('next');

          this.next();
          break;
        case 'previous':
          if (!this.hasAttribute('previous')) return;
          this.removeAttribute('previous');

          this.previous();
          break;
        default:
          // do nothing
      }
    }

    connectedCallback () {
      this.current = this.shadowRoot.querySelector('.current');

      this.handleNewCurrent();

      this.declareListeners();

      if (typeof this.onBindReady === 'function') this.onBindReady();
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

    declareListeners () {
      this.shadowRoot.querySelectorAll('.option img').forEach(img => {
        img.addEventListener('click', (event) => {
          if (this.current === img.parentElement) return;

          // We get the div where the image is and assign that as current
          this.current = img.parentElement;

          this.handleNewCurrent();
        });
      });
    }

    next () {
      if (!this.current.nextElementSibling) return;

      this.current = this.current.nextElementSibling;

      this.handleNewCurrent();
    }

    previous () {
      if (!this.current.previousElementSibling) return;

      this.current = this.current.previousElementSibling;

      this.handleNewCurrent();
    }

    handleNewCurrent () {
      if (this.current.classList) {
        this.shadowRoot.querySelector('.current').classList.remove('current');
        this.current.classList.add('current');
      }

      if (typeof this.onCurrentChange === 'function') {
        this.onCurrentChange(this.shadowRoot.querySelector('.current .title').innerHTML, this.shadowRoot.querySelector('.current .url').getAttribute('src'));
      }

      this.setAttribute('title', this.shadowRoot.querySelector('.current .title').innerHTML);
      this.setAttribute('url', this.shadowRoot.querySelector('.current .url').getAttribute('src'));
    }
  }

  customElements.define('sl1-playlist', SlimyPlaylist);
})();
