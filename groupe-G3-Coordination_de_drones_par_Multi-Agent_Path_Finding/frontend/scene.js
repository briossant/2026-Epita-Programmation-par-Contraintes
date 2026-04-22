export class CityScene {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040810);
    this.scene.fog = new THREE.FogExp2(0x040810, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 500
    );
    this.camera.position.set(14, 12, 18);

    this.controls = new THREE.OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(5, 2, 5);

    this._noFlyMeshes = [];
    this._addLights();
    this._addGround();
  }

  _addLights() {
    this.scene.add(new THREE.AmbientLight(0x0f1a2e, 1.5));
    const dir = new THREE.DirectionalLight(0x93c5fd, 0.9);
    dir.position.set(20, 40, 20);
    this.scene.add(dir);
    // Subtle fill from below
    const fill = new THREE.DirectionalLight(0x1e3a5f, 0.3);
    fill.position.set(-10, -5, -10);
    this.scene.add(fill);
  }

  _addGround(size = 80) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshPhongMaterial({ color: 0x070d1a })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(size / 4, -0.01, size / 4);
    this.scene.add(ground);

    const grid = new THREE.GridHelper(size, size / 2, 0x0f2744, 0x091522);
    grid.position.set(size / 4, 0, size / 4);
    this.scene.add(grid);
  }

  addBuildings(buildings, cellSize = 1.0) {
    this._buildingMeshes = [];
    for (const b of buildings) {
      const h = b.height * cellSize * 1.5;
      const geo = new THREE.BoxGeometry(cellSize * 0.85, h, cellSize * 0.85);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x0d1f3c, emissive: 0x071020, transparent: true, opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.col * cellSize, h / 2, b.row * cellSize);
      this.scene.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.5 })
      );
      edges.position.copy(mesh.position);
      this.scene.add(edges);

      if (b.height >= 3) {
        const light = new THREE.PointLight(0x1e3a5f, 0.6, 6);
        light.position.set(b.col * cellSize, h + 0.3, b.row * cellSize);
        this.scene.add(light);
      }
      this._buildingMeshes.push(mesh);
    }
  }

  addNoFlyBox(minPos, maxPos, cellSize = 1.0) {
    const [r0, c0] = minPos, [r1, c1] = maxPos;
    const w = (c1 - c0 + 1) * cellSize;
    const d = (r1 - r0 + 1) * cellSize;
    const h = 8;
    const geo = new THREE.BoxGeometry(w, h, d);

    const mesh = new THREE.Mesh(geo,
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.15 }));
    mesh.position.set((c0 + c1) / 2 * cellSize, h / 2, (r0 + r1) / 2 * cellSize);
    this.scene.add(mesh);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 }));
    edges.position.copy(mesh.position);
    this.scene.add(edges);

    this._noFlyMeshes.push(mesh, edges);
    return mesh;
  }

  clearNoFly() {
    for (const m of this._noFlyMeshes) this.scene.remove(m);
    this._noFlyMeshes = [];
  }

  update() { this.controls.update(); }
  render() { this.renderer.render(this.scene, this.camera); }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
