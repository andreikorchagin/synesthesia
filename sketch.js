let mic, fft;
let started = false;
let mode = 0;
let numModes = 6;
let particles = [];
let lastBass = 0;
let beatThreshold = 200;
let hueOffset = 0;
let time = 0;

// Mouse interaction
let mouseInfluence = 0; // 0-1, how much mouse affects visualization

// Color schemes
let schemes = [
  { name: "Neon", colors: [320, 180, 60, 280] },
  { name: "Fire", colors: [0, 30, 45, 15] },
  { name: "Ocean", colors: [180, 200, 220, 240] },
  { name: "Vapor", colors: [300, 180, 330, 200] },
  { name: "Mono", colors: [0, 0, 0, 0] }
];
let currentScheme = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  document.querySelector('canvas').style.display = 'none';
  document.getElementById('start-btn').addEventListener('click', startAudio);
}

function startAudio() {
  userStartAudio().then(() => {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT(0.8, 512);
    fft.setInput(mic);
    started = true;
    document.getElementById('start-btn').style.display = 'none';
    document.querySelector('canvas').style.display = 'block';
  });
}

function draw() {
  if (!started) return;

  time += 0.01;
  hueOffset += 0.5;

  let spectrum = fft.analyze();
  let waveform = fft.waveform();
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");
  let level = mic.getLevel();

  // Beat detection
  let beat = bass > beatThreshold && bass - lastBass > 30;
  lastBass = bass;

  // Spawn particles on beat
  if (beat) {
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(width/2, height/2, bass, mid));
    }
  }

  // Background with bass-reactive fade
  let fadeAmount = map(bass, 0, 255, 8, 25);
  background(0, 0, 0, fadeAmount);

  // Screen shake on heavy bass
  push();
  if (bass > 220) {
    translate(random(-5, 5), random(-5, 5));
  }

  switch(mode) {
    case 0: drawCircularSpectrum(spectrum, bass, mid, treble); break;
    case 1: drawWaveformTunnel(waveform, bass, mid); break;
    case 2: drawParticleField(spectrum, bass); break;
    case 3: drawMirrorBars(spectrum, bass, mid); break;
    case 4: drawSpiralGalaxy(spectrum, bass, treble); break;
    case 5: drawGeometricPulse(spectrum, bass, mid, treble); break;
  }

  pop();

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // Calculate mouse influence (distance from center)
  let dx = mouseX - width / 2;
  let dy = mouseY - height / 2;
  let distFromCenter = sqrt(dx * dx + dy * dy);
  mouseInfluence = constrain(distFromCenter / (min(width, height) * 0.5), 0, 1);

  // Draw mode indicator
  drawUI();
}

// MODE 0: Enhanced circular spectrum
function drawCircularSpectrum(spectrum, bass, mid, treble) {
  push();
  // Subtle drift toward mouse
  let cx = lerp(width/2, mouseX, 0.03);
  let cy = lerp(height/2, mouseY, 0.03);
  translate(cx, cy);

  let numBars = 180;
  let radius = min(width, height) * 0.2;

  // Outer spectrum
  for (let i = 0; i < numBars; i++) {
    let angle = map(i, 0, numBars, 0, TWO_PI);
    let index = floor(map(i, 0, numBars, 0, spectrum.length / 2));
    let amp = spectrum[index];
    let r = map(amp, 0, 255, radius, radius + 200);

    let hue = (getSchemeHue(i / numBars) + hueOffset) % 360;
    let sat = schemes[currentScheme].name === "Mono" ? 0 : map(amp, 0, 255, 50, 100);
    let bri = map(amp, 0, 255, 30, 100);

    stroke(hue, sat, bri, 80);
    strokeWeight(map(amp, 0, 255, 1, 4));

    let x1 = cos(angle) * radius;
    let y1 = sin(angle) * radius;
    let x2 = cos(angle) * r;
    let y2 = sin(angle) * r;
    line(x1, y1, x2, y2);
  }

  // Inner rotating rings
  noFill();
  for (let j = 0; j < 3; j++) {
    let ringRadius = map(j, 0, 3, radius * 0.3, radius * 0.8);
    let energy = j === 0 ? bass : j === 1 ? mid : treble;
    ringRadius += map(energy, 0, 255, 0, 30);

    let hue = (getSchemeHue(j / 3) + hueOffset) % 360;
    stroke(hue, 80, 90, 60);
    strokeWeight(2);

    beginShape();
    for (let i = 0; i < 60; i++) {
      let angle = map(i, 0, 60, 0, TWO_PI) + time * (j + 1) * 0.5;
      let wobble = sin(angle * 6 + time * 3) * map(energy, 0, 255, 0, 20);
      let x = cos(angle) * (ringRadius + wobble);
      let y = sin(angle) * (ringRadius + wobble);
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  // Center pulse
  let pulseSize = map(bass, 0, 255, 30, 120);
  let hue = (getSchemeHue(0.5) + hueOffset) % 360;
  fill(hue, 70, 95, 50);
  noStroke();
  ellipse(0, 0, pulseSize);

  pop();
}

// MODE 1: Waveform tunnel
function drawWaveformTunnel(waveform, bass, mid) {
  push();
  // Subtle drift toward mouse
  let cx = lerp(width/2, mouseX, 0.05);
  let cy = lerp(height/2, mouseY, 0.05);
  translate(cx, cy);

  let numRings = 20;
  noFill();

  for (let ring = 0; ring < numRings; ring++) {
    let depth = map(ring, 0, numRings, 1, 0);
    let radius = map(ring, 0, numRings, min(width, height) * 0.4, 50);
    radius += map(bass, 0, 255, 0, 30) * depth;

    let hue = (getSchemeHue(ring / numRings) + hueOffset + ring * 10) % 360;
    let alpha = map(ring, 0, numRings, 90, 20);
    stroke(hue, 80, 90, alpha);
    strokeWeight(map(ring, 0, numRings, 3, 1));

    beginShape();
    for (let i = 0; i < waveform.length; i += 4) {
      let angle = map(i, 0, waveform.length, 0, TWO_PI);
      let offset = (time * 2 + ring * 0.2) % TWO_PI;
      let r = radius + waveform[i] * 100 * depth;
      let x = cos(angle + offset) * r;
      let y = sin(angle + offset) * r;
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  pop();
}

// MODE 2: Particle field
function drawParticleField(spectrum, bass) {
  push();

  let cols = 40;
  let rows = 25;
  let cellW = width / cols;
  let cellH = height / rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let index = floor(map(x, 0, cols, 0, spectrum.length / 4));
      let amp = spectrum[index];

      let px = x * cellW + cellW / 2;
      let py = y * cellH + cellH / 2;

      // Displacement based on audio
      let noiseVal = noise(x * 0.1, y * 0.1, time);
      let angle = noiseVal * TWO_PI * 2 + time;
      let displacement = map(amp, 0, 255, 0, 30);
      px += cos(angle) * displacement;
      py += sin(angle) * displacement;

      // Subtle mouse attraction - particles drift gently toward cursor
      let mdx = mouseX - px;
      let mdy = mouseY - py;
      let md = sqrt(mdx * mdx + mdy * mdy);
      if (md > 0 && md < 300) {
        let attraction = map(md, 0, 300, 2, 0);
        px += (mdx / md) * attraction;
        py += (mdy / md) * attraction;
      }

      let size = map(amp, 0, 255, 2, 15);

      let hue = (getSchemeHue((x + y) / (cols + rows)) + hueOffset) % 360;
      let bri = map(amp, 0, 255, 20, 100);

      noStroke();
      fill(hue, 80, bri, 70);
      ellipse(px, py, size);
    }
  }

  pop();
}

// MODE 3: Mirror bars
function drawMirrorBars(spectrum, bass, mid) {
  push();

  let numBars = 64;
  let barWidth = width / numBars;

  // Mouse influences the center line position subtly
  let centerY = lerp(height/2, mouseY, 0.05);

  for (let i = 0; i < numBars; i++) {
    let index = floor(map(i, 0, numBars, 0, spectrum.length / 2));
    let amp = spectrum[index];
    let barHeight = map(amp, 0, 255, 5, height * 0.45);

    let hue = (getSchemeHue(i / numBars) + hueOffset) % 360;
    let sat = schemes[currentScheme].name === "Mono" ? 0 : 85;

    // Top bars
    fill(hue, sat, 90, 80);
    noStroke();
    rect(i * barWidth, centerY - barHeight, barWidth - 2, barHeight, 3);

    // Bottom bars (mirror)
    fill(hue, sat, 70, 60);
    rect(i * barWidth, centerY, barWidth - 2, barHeight, 3);

    // Glow on peaks
    if (amp > 200) {
      fill(hue, 60, 100, 30);
      ellipse(i * barWidth + barWidth/2, centerY, barWidth * 2, barHeight * 0.3);
    }
  }

  // Center line
  stroke(0, 0, 100, map(bass, 0, 255, 20, 80));
  strokeWeight(2);
  line(0, centerY, width, centerY);

  pop();
}

// MODE 4: Spiral galaxy
function drawSpiralGalaxy(spectrum, bass, treble) {
  push();
  // Galaxy center follows mouse slightly
  let centerX = lerp(width/2, mouseX, 0.05);
  let centerY = lerp(height/2, mouseY, 0.05);
  translate(centerX, centerY);

  // Mouse distance affects rotation speed
  let mouseAngle = atan2(mouseY - height/2, mouseX - width/2);
  rotate(time * 0.2 + mouseAngle * 0.1);

  let arms = 5;
  let pointsPerArm = 80;

  noStroke();

  for (let arm = 0; arm < arms; arm++) {
    let armOffset = (TWO_PI / arms) * arm;

    for (let i = 0; i < pointsPerArm; i++) {
      let index = floor(map(i, 0, pointsPerArm, 0, spectrum.length / 3));
      let amp = spectrum[index];

      let angle = map(i, 0, pointsPerArm, 0, TWO_PI * 2.5) + armOffset;
      let radius = map(i, 0, pointsPerArm, 20, min(width, height) * 0.45);
      radius += map(amp, 0, 255, 0, 40);

      // Add spiral wobble
      let wobble = sin(angle * 3 + time * 2) * map(bass, 0, 255, 5, 25);
      radius += wobble;

      let x = cos(angle) * radius;
      let y = sin(angle) * radius;

      let hue = (getSchemeHue(i / pointsPerArm) + hueOffset + arm * 30) % 360;
      let size = map(amp, 0, 255, 3, 15);
      let alpha = map(i, 0, pointsPerArm, 90, 40);

      fill(hue, 80, 90, alpha);
      ellipse(x, y, size);

      // Star twinkle effect
      if (random() > 0.97 && amp > 100) {
        fill(0, 0, 100, 80);
        ellipse(x, y, size * 2);
      }
    }
  }

  // Center glow
  let centerSize = map(bass, 0, 255, 40, 100);
  for (let i = 3; i > 0; i--) {
    let hue = (getSchemeHue(0.5) + hueOffset) % 360;
    fill(hue, 60, 100, 20);
    ellipse(0, 0, centerSize * i);
  }

  pop();
}

// MODE 5: Geometric pulse
function drawGeometricPulse(spectrum, bass, mid, treble) {
  push();
  // Subtle drift toward mouse
  let cx = lerp(width/2, mouseX, 0.03);
  let cy = lerp(height/2, mouseY, 0.03);
  translate(cx, cy);

  let shapes = 6;
  let maxRadius = min(width, height) * 0.4;

  for (let s = 0; s < shapes; s++) {
    let sides = s + 3; // Triangle, square, pentagon, etc.
    let energy = s < 2 ? bass : s < 4 ? mid : treble;
    let radius = map(s, 0, shapes, maxRadius * 0.2, maxRadius);
    radius += map(energy, 0, 255, 0, 50);

    let rotation = time * (s % 2 === 0 ? 1 : -1) * (0.5 + s * 0.1);

    let hue = (getSchemeHue(s / shapes) + hueOffset) % 360;
    let alpha = map(s, 0, shapes, 80, 40);

    stroke(hue, 80, 90, alpha);
    strokeWeight(map(energy, 0, 255, 1, 4));
    noFill();

    beginShape();
    for (let i = 0; i < sides; i++) {
      let angle = map(i, 0, sides, 0, TWO_PI) + rotation;
      let r = radius + sin(angle * sides + time * 3) * map(energy, 0, 255, 0, 30);
      let x = cos(angle) * r;
      let y = sin(angle) * r;
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  // Center eye
  let eyeSize = map(bass, 0, 255, 20, 60);
  fill(0, 0, 100, 90);
  noStroke();
  ellipse(0, 0, eyeSize);
  fill(0, 0, 0);
  ellipse(0, 0, eyeSize * 0.5);

  pop();
}

function getSchemeHue(t) {
  let colors = schemes[currentScheme].colors;
  let index = floor(t * colors.length);
  let nextIndex = (index + 1) % colors.length;
  let blend = (t * colors.length) % 1;
  return lerp(colors[index], colors[nextIndex], blend);
}

function drawUI() {
  push();

  // Mode name
  let modeNames = ["Circular", "Tunnel", "Field", "Bars", "Galaxy", "Geometry"];

  fill(0, 0, 100, 60);
  noStroke();
  textFont('monospace');
  textSize(14);
  textAlign(LEFT, TOP);
  text(`MODE: ${modeNames[mode]} (1-6)`, 20, 20);
  text(`COLOR: ${schemes[currentScheme].name} (C)`, 20, 40);
  text(`[SPACE] Next Mode`, 20, 60);

  pop();
}

class Particle {
  constructor(x, y, bass, mid) {
    this.pos = createVector(x, y);
    let angle = random(TWO_PI);
    let speed = map(bass, 0, 255, 3, 15);
    this.vel = createVector(cos(angle) * speed, sin(angle) * speed);
    this.acc = createVector(0, 0);
    this.life = 255;
    this.decay = random(3, 8);
    this.size = map(mid, 0, 255, 5, 20);
    this.hue = random(360);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.vel.mult(0.98);
    this.life -= this.decay;
  }

  draw() {
    noStroke();
    let alpha = map(this.life, 0, 255, 0, 80);
    fill((this.hue + hueOffset) % 360, 80, 90, alpha);
    ellipse(this.pos.x, this.pos.y, this.size * (this.life / 255));
  }

  isDead() {
    return this.life <= 0;
  }
}

function keyPressed() {
  if (key === ' ') {
    mode = (mode + 1) % numModes;
  } else if (key === 'c' || key === 'C') {
    currentScheme = (currentScheme + 1) % schemes.length;
  } else if (key >= '1' && key <= '6') {
    mode = int(key) - 1;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

