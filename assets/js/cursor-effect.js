// ===================================================================
// INTERACTIVE CURSOR EFFECT
// RGB split, chromatic aberration & block displacement on hover
// Ported from the Interactive-Cursor prototype
// ===================================================================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const DEFAULTS = {
  gridSize: 80,
  mouseRadius: 0.25,
  strength: 0.1,
  relaxation: 0.925,
  displacement: 0.015,
  aberration: 0.05,
  fit: "cover", // "cover" (object-fit:cover) or "fill" (stretch)
};

export class InteractiveCursorEffect {
  /**
   * @param {HTMLElement}  container   – Element to append the WebGL canvas into
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} source – Texture source
   * @param {object}       [options]
   * @param {HTMLElement}  [options.mouseTarget] – Element to listen for mouse/touch (defaults to container)
   * @param {"cover"|"fill"} [options.fit]       – How the source fills the container
   */
  constructor(container, source, options = {}) {
    this.container = container;
    this.source = source;
    this.opts = { ...DEFAULTS, ...options };
    this.mouseTarget = this.opts.mouseTarget || container;

    this.mouse = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, vX: 0, vY: 0 };
    this.width = container.offsetWidth || 1;
    this.height = container.offsetHeight || 1;
    this.gridX = 0;
    this.gridY = 0;

    this.isDynamic =
      source instanceof HTMLCanvasElement ||
      source instanceof HTMLVideoElement;

    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundResize = this._onResize.bind(this);

    this._setup();
  }

  // -------------------------------------------------------
  // SETUP
  // -------------------------------------------------------
  _setup() {
    // Scene & camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Canvas element — position absolutely inside the container
    const el = this.renderer.domElement;
    el.classList.add("interactive-effect-canvas");
    Object.assign(el.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
    });
    this.container.appendChild(el);

    // ---- Source texture ----
    this.texture = new THREE.Texture(this.source);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    if (this.isDynamic) {
      this.texture.needsUpdate = true;
    } else if (this.source.complete) {
      this.texture.needsUpdate = true;
    } else {
      this.source.addEventListener("load", () => {
        this.texture.needsUpdate = true;
        this._rebuildGeometry();
      });
    }

    // Hide original <img> (canvas/video sources stay visible for their own renderers)
    if (!this.isDynamic) {
      this.source.style.opacity = "0";
    }

    // ---- Displacement data texture (grid) ----
    this.dataTexture = this._buildDataTexture();

    // ---- Shader material ----
    const d = this.opts.displacement;
    const a = this.opts.aberration;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.texture },
        uDataTexture: { value: this.dataTexture },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uDataTexture;
        varying vec2 vUv;

        void main() {
          vec4 offset = texture2D(uDataTexture, vUv);
          vec2 shift  = ${d.toFixed(4)} * offset.rg;
          vec2 split  = shift * ${a.toFixed(4)};

          float r = texture2D(uTexture, vUv - shift + split).r;
          float g = texture2D(uTexture, vUv + shift).g;
          float b = texture2D(uTexture, vUv - shift - split).b;

          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `,
    });

    // ---- Plane mesh ----
    this.geometry = new THREE.PlaneGeometry(...this._planeScale());
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // ---- Event listeners ----
    this.mouseTarget.addEventListener("mousemove", this._boundMouseMove);
    this.mouseTarget.addEventListener("touchmove", this._boundTouchMove, {
      passive: true,
    });
    window.addEventListener("resize", this._boundResize);

    // ---- Start render loop (optimized with IntersectionObserver) ----
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderer.setAnimationLoop(() => this._render());
          } else {
            this.renderer.setAnimationLoop(null);
          }
        });
      },
      { threshold: 0.0 }
    );
    this.observer.observe(this.container);
  }

  // -------------------------------------------------------
  // PLANE SCALE — mimics object-fit: cover  or  fill/stretch
  // -------------------------------------------------------
  _planeScale() {
    if (this.opts.fit === "fill") return [2, 2];

    let iw, ih;
    if (this.source instanceof HTMLCanvasElement) {
      iw = this.source.width;
      ih = this.source.height;
    } else if (this.source instanceof HTMLVideoElement) {
      iw = this.source.videoWidth || 16;
      ih = this.source.videoHeight || 9;
    } else {
      iw = this.source.naturalWidth || 16;
      ih = this.source.naturalHeight || 9;
    }

    const ia = iw / ih;
    const ca = this.width / this.height;
    let sx = 1,
      sy = 1;
    if (ca < ia) sx = ia / ca;
    else sy = ca / ia;
    return [2 * sx, 2 * sy];
  }

  _rebuildGeometry() {
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(...this._planeScale());
  }

  // -------------------------------------------------------
  // DISPLACEMENT GRID
  // -------------------------------------------------------
  _buildDataTexture() {
    const aspect = this.width / this.height;
    const gs = this.opts.gridSize;

    this.gridX = aspect >= 1 ? Math.round(gs * aspect) : gs;
    this.gridY = aspect >= 1 ? gs : Math.round(gs / aspect);

    const data = new Float32Array(this.gridX * this.gridY * 4);
    const tex = new THREE.DataTexture(
      data,
      this.gridX,
      this.gridY,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }

  _updateDataTexture() {
    const data = this.dataTexture.image.data;
    const { relaxation, strength, mouseRadius, gridSize } = this.opts;

    // Relax existing displacement
    for (let i = 0; i < data.length; i += 4) {
      data[i] *= relaxation;
      data[i + 1] *= relaxation;
    }

    // Mouse → grid coordinates
    const gmx = this.gridX * this.mouse.x;
    const gmy = this.gridY * (1 - this.mouse.y);
    const maxDist = gridSize * mouseRadius;
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const dSq = (gmx - i) ** 2 + (gmy - j) ** 2;
        if (dSq >= maxDistSq) continue;

        const idx = 4 * (i + this.gridX * j);
        const dist = Math.sqrt(dSq);
        const power = Math.min(10, maxDist / Math.max(dist, 0.001));

        data[idx] += strength * 100 * this.mouse.vX * power;
        data[idx + 1] -= strength * 100 * this.mouse.vY * power;
      }
    }

    this.mouse.vX *= 0.9;
    this.mouse.vY *= 0.9;
    this.dataTexture.needsUpdate = true;
  }

  // -------------------------------------------------------
  // INPUT
  // -------------------------------------------------------
  _onMouseMove(e) {
    const r = this.container.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    this.mouse.vX = x - this.mouse.x;
    this.mouse.vY = y - this.mouse.y;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
  }

  _onTouchMove(e) {
    if (!e.touches.length) return;
    const t = e.touches[0];
    const r = this.container.getBoundingClientRect();
    const x = (t.clientX - r.left) / r.width;
    const y = (t.clientY - r.top) / r.height;
    this.mouse.vX = x - this.mouse.x;
    this.mouse.vY = y - this.mouse.y;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
  }

  // -------------------------------------------------------
  // RESIZE
  // -------------------------------------------------------
  _onResize() {
    this.width = this.container.offsetWidth || 1;
    this.height = this.container.offsetHeight || 1;

    this._rebuildGeometry();
    this.dataTexture.dispose();
    this.dataTexture = this._buildDataTexture();
    this.material.uniforms.uDataTexture.value = this.dataTexture;
    this.renderer.setSize(this.width, this.height);
  }

  // -------------------------------------------------------
  // RENDER LOOP
  // -------------------------------------------------------
  _render() {
    // Re-upload dynamic textures (canvas / video) every frame
    if (this.isDynamic) {
      this.texture.needsUpdate = true;
    }
    this._updateDataTexture();
    this.renderer.render(this.scene, this.camera);
  }

  // -------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------
  destroy() {
    if (this.observer) this.observer.disconnect();
    this.renderer.setAnimationLoop(null);
    this.mouseTarget.removeEventListener("mousemove", this._boundMouseMove);
    this.mouseTarget.removeEventListener("touchmove", this._boundTouchMove);
    window.removeEventListener("resize", this._boundResize);
    this.renderer.dispose();
    this.material.dispose();
    this.geometry.dispose();
    this.dataTexture.dispose();
    this.texture.dispose();
    this.renderer.domElement.remove();
  }
}
