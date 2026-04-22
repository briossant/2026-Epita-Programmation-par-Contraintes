const COLORS = [
  0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7,
  0x06b6d4, 0xec4899, 0x84cc16, 0xfb923c, 0xe11d48,
  0x8b5cf6, 0x0ea5e9, 0x10b981, 0xf97316, 0x6366f1,
];
const CELL      = 1.0;
const TRAIL_LEN = 60;

export class DroneManager {
  constructor(droneConfigs, scene) {
    this.scene  = scene;
    this.drones = [];

    for (let i = 0; i < droneConfigs.length; i++) {
      const col = COLORS[i % COLORS.length];
      const d   = droneConfigs[i];

      // Body + point-light glow
      const geo  = new THREE.SphereGeometry(0.22, 14, 14);
      const mat  = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.7 });
      const mesh = new THREE.Mesh(geo, mat);
      const light = new THREE.PointLight(col, 1.8, 4.5);
      mesh.add(light);
      scene.add(mesh);

      // Trail
      const buf      = new Float32Array(TRAIL_LEN * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
      trailGeo.setDrawRange(0, 0);
      const trail = new THREE.Line(trailGeo,
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
      scene.add(trail);

      // Start — torus ring flat on ground
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.06, 8, 24),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(d.start[1] * CELL, 0.05, d.start[0] * CELL);
      scene.add(ring);

      // Goal — glowing vertical pillar + beacon light
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 3, 8),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65 })
      );
      pillar.position.set(d.goal[1] * CELL, 1.5, d.goal[0] * CELL);
      scene.add(pillar);

      const beacon = new THREE.PointLight(col, 0.9, 3.5);
      beacon.position.copy(pillar.position);
      scene.add(beacon);

      // Star marker at top of pillar
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18),
        new THREE.MeshBasicMaterial({ color: col })
      );
      star.position.set(d.goal[1] * CELL, 3.1, d.goal[0] * CELL);
      scene.add(star);

      this.drones.push({
        id: d.id, mesh, trail, trailPts: [],
        ring, pillar, beacon, star, col,
      });
    }
  }

  _toWorld(pos) {
    return new THREE.Vector3(
      pos[1] * CELL,
      (pos[2] ?? 0) * CELL * 1.5 + 0.4,
      pos[0] * CELL
    );
  }

  updateFrame(paths, t) {
    for (const d of this.drones) {
      const path = paths[String(d.id)];
      if (!path) continue;
      const world = this._toWorld(path[Math.min(t, path.length - 1)]);
      d.mesh.position.copy(world);

      d.trailPts.push(world.clone());
      if (d.trailPts.length > TRAIL_LEN) d.trailPts.shift();

      const attr = d.trail.geometry.attributes.position;
      for (let i = 0; i < d.trailPts.length; i++)
        attr.setXYZ(i, d.trailPts[i].x, d.trailPts[i].y, d.trailPts[i].z);
      attr.needsUpdate = true;
      d.trail.geometry.setDrawRange(0, d.trailPts.length);
    }

    // Conflict flash — drones within 1.2 cells
    for (let i = 0; i < this.drones.length; i++)
      for (let j = i + 1; j < this.drones.length; j++)
        if (this.drones[i].mesh.position.distanceTo(this.drones[j].mesh.position) < 1.2 * CELL)
          this._flash(this.drones[i], this.drones[j]);
  }

  _flash(da, db) {
    [da, db].forEach(d => {
      d.mesh.material.emissiveIntensity = 3.0;
      setTimeout(() => { d.mesh.material.emissiveIntensity = 0.7; }, 100);
    });
  }

  animateTrails() {
    const t = Date.now() * 0.002;
    this.drones.forEach((d, i) => {
      // Subtle hover bob
      d.mesh.position.y += Math.sin(t + i * 1.3) * 0.003;
      // Slowly spin the goal star
      d.star.rotation.y += 0.02;
    });
  }

  dispose(scene) {
    for (const d of this.drones)
      [d.mesh, d.trail, d.ring, d.pillar, d.beacon, d.star]
        .forEach(o => scene.remove(o));
    this.drones = [];
  }
}
