import * as THREE from 'three';

// Cielo de atardecer y mar, con un sol bajo en el horizonte (hacia -z).

const SOL = new THREE.Vector3(0, 0.06, -1).normalize();

const colores = /* glsl */ `
  vec3 cielo(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0);
    vec3 horizonte = vec3(1.0, 0.45, 0.18);
    vec3 alto = vec3(0.16, 0.10, 0.24);
    vec3 c = mix(horizonte, alto, pow(max(h, 0.0), 0.45));
    float s = max(dot(d, normalize(vec3(${SOL.x}, ${SOL.y}, ${SOL.z}))), 0.0);
    c += vec3(1.0, 0.6, 0.3) * pow(s, 32.0) * 0.6;
    c += vec3(1.0, 0.85, 0.6) * smoothstep(0.9993, 0.9997, s) * 4.0;
    return c * 0.7;
  }
`;

export function crearMar() {
  const grupo = new THREE.Group();

  const cieloMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      ${colores}
      void main() {
        gl_FragColor = vec4(cielo(normalize(vDir)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), cieloMat);
  cielo.renderOrder = -1;
  grupo.add(cielo);

  const marMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uTiempo: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vPos = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      varying vec3 vPos;
      ${colores}
      void main() {
        vec2 p = vPos.xz;
        float t = uTiempo;
        // Olas: suma de ondas para inclinar la superficie.
        vec2 g = vec2(0.0);
        g += vec2(0.3, 1.0) * cos(dot(p, vec2(0.03, 0.10)) + t * 0.8) * 0.12;
        g += vec2(-0.7, 0.7) * cos(dot(p, vec2(-0.09, 0.09)) + t * 1.1) * 0.08;
        g += vec2(1.0, 0.2) * cos(dot(p, vec2(0.25, 0.05)) + t * 1.7) * 0.05;
        g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.08, -0.4)) + t * 2.3) * 0.04;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(vPos - cameraPosition);
        vec3 r = reflect(v, n);
        r.y = abs(r.y);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-v, n), 0.0), 5.0);
        vec3 agua = vec3(0.02, 0.04, 0.07);
        vec3 c = mix(agua, cielo(r), fres);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), marMat);
  mar.rotation.x = -Math.PI / 2;
  mar.position.y = -6;
  grupo.add(mar);

  function actualizar(t) {
    marMat.uniforms.uTiempo.value = t;
  }

  return { grupo, actualizar };
}
