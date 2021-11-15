/* globals HTMLElement, customElements, AudioContext, requestAnimationFrame */

import './lib/webaudio-controls.js';
import { getBaseURL, getFile } from './lib/utils.js';
import './slimyProgressBar/index.js';

(async () => {
  const template = document.createElement('template');

  // Forced to use a fetch request because MIME text/html won't work on import
  template.innerHTML = (await getFile('./template.html', import.meta.url))
    .replace('{{cssStyle}}', '<style>' + await getFile('./template.css', import.meta.url) + '</style>');

  class SlimyAudioPlayer extends HTMLElement {
    constructor () {
      super();
      this.volume = 1;
      this.attachShadow({ mode: 'open' });

      this.basePath = getBaseURL(import.meta.url); // url absolu du composant
      // Fix relative path in WebAudio Controls elements

      this.fixRelativePaths();

      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    static get observedAttributes () {
      return ['url', 'title'];
    }

    attributeChangedCallback (name, oldValue, newValue) {
      const isPlaying = this.player !== undefined && !this.player.paused;
      switch (name) {
        case 'title':
          this.shadowRoot.querySelector('#title').innerHTML = 'Musique actuelle: ' + newValue;
          break;
        case 'url':
          this.player.src = newValue;
          if (isPlaying) this.play();
          break;
        default:
          // do nothing
      }
    }

    moveHandler (event, boundingBox, isClicked) {
      if (!isClicked) return;
      this.player.currentTime = (((event.clientX - boundingBox.left) / boundingBox.width) * this.player.duration);
    }

    connectedCallback () {
      this.player = this.shadowRoot.querySelector('#audioPlayer');

      if (this.getAttribute('url')) this.player.src = this.getAttribute('url');

      this.progressBar = this.shadowRoot.querySelector('sl1-progressbar');

      this.funPart = this.shadowRoot.querySelector('#funPart');

      this.declareListeners();

      this.buildAudioGraph();

      this.handleCanvas();

      requestAnimationFrame(this.animationLoop.bind(this));
    }

    animationLoop () {
      // Clear the canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw
      this.analyserNode.getByteFrequencyData(this.dataArray);

      const barWidth = this.canvas.width / this.bufferLength;
      const heightScale = this.canvas.height / 128;

      let mean = 0;

      for (let i = 0; i < this.bufferLength; i++) {
        let barHeight = this.dataArray[i];

        mean += barHeight;

        this.ctx.fillStyle = 'rgb(50,50,' + (barHeight + 100) + ')';
        barHeight *= heightScale;
        this.ctx.fillRect(i * (barWidth + 1), this.canvas.height - barHeight / 2, barWidth, barHeight / 2);
      }

      mean /= this.bufferLength;

      this.funPart.value = mean / 128 * 100;

      // Repeat
      requestAnimationFrame(this.animationLoop.bind(this));
    }

    handleCanvas () {
      this.canvas = this.shadowRoot.querySelector('#visualizer');
      this.ctx = this.canvas.getContext('2d');
    }

    buildAudioGraph () {
      this.audioContext = new AudioContext();

      const audioPlayerNode = this.audioContext.createMediaElementSource(this.player);

      this.filters = [];

      [60, 170, 350, 1000, 3500, 10000].forEach((freq, i) => {
        const eq = this.audioContext.createBiquadFilter();
        eq.frequency.value = freq;
        eq.type = 'peaking';
        eq.gain.value = 0;
        this.filters.push(eq);
      });

      audioPlayerNode.connect(this.filters[0]);

      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.bufferLength = this.analyserNode.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      this.filters[this.filters.length - 1].connect(this.analyserNode);

      this.pannerNode = this.audioContext.createStereoPanner();

      this.analyserNode.connect(this.pannerNode);

      this.pannerNode.connect(this.audioContext.destination);
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
      this.progressBar.onBarMove = this.moveHandler.bind(this);

      this.shadowRoot.querySelector('#playButton').addEventListener('click', (_) => {
        if (this.player.paused) {
          this.play();
        } else {
          this.pause();
        }
      });

      this.shadowRoot.querySelector('#stopButton').addEventListener('click', (_) => {
        this.restart();
      });

      this.shadowRoot.querySelector('#loopButton').addEventListener('click', (_) => {
        this.loop();
      });

      this.shadowRoot.querySelector('#forwardTen').addEventListener('click', (_) => {
        this.player.currentTime = Math.min(this.player.currentTime + 10, this.player.duration);
      });

      this.shadowRoot.querySelector('#backwardTen').addEventListener('click', (_) => {
        this.player.currentTime = Math.max(this.player.currentTime - 10, 0);
      });

      this.shadowRoot.querySelector('#nextSong').addEventListener('click', (_) => {
        if (typeof this.onNextSong === 'function') this.onNextSong();
      });

      this.shadowRoot.querySelector('#previousSong').addEventListener('click', (_) => {
        if (typeof this.onPreviousSong === 'function') this.onPreviousSong();
      });

      this.shadowRoot.querySelector('#knobVolume').addEventListener('input', (event) => {
        this.setVolume(event.target.value);
      });

      this.shadowRoot.querySelector('#knobBalance').addEventListener('input', (event) => {
        this.setBalance(event.target.value);
      });

      this.player.ontimeupdate = (_) => {
        this.progressBar.setAttribute('current-time', this.player.currentTime);
        this.progressBar.setAttribute('start-time', 0);
        this.progressBar.setAttribute('end-time', this.player.duration);
      };

      this.player.addEventListener('ended', (_) => {
        this.pause();
      });

      for (let i = 0; i < 6; i++) {
        this.shadowRoot.querySelector('#gain' + i).addEventListener('input', (event) => {
          this.filters[i].gain.value = event.target.value;
        });
      }
    }

    setVolume (val) {
      this.player.volume = val;
    }

    play () {
      this.player.play();
      this.audioContext.resume();
      this.shadowRoot.querySelector('#playButton').setAttribute('src', this.basePath + './assets/imgs/pause.svg');
    }

    pause () {
      this.player.pause();
      this.audioCtx.resume();
      this.shadowRoot.querySelector('#playButton').setAttribute('src', this.basePath + './assets/imgs/play.svg');
    }

    restart () {
      this.pause();
      this.player.currentTime = 0;
    }

    loop () {
      this.player.loop = !this.player.loop;
      if (this.player.loop) {
        this.shadowRoot.querySelector('#loopButton').classList.add('enabled');
      } else {
        this.shadowRoot.querySelector('#loopButton').classList.remove('enabled');
      }
    }

    setBalance (val) {
      this.pannerNode.pan.value = val;
    }
  }

  customElements.define('sl1-audioplayer', SlimyAudioPlayer);
})();
