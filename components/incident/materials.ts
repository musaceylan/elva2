import * as THREE from "three";

/**
 * The x-ray shell.
 *
 * The VinFast-style cutaway is the whole reason this scene is real 3D: the
 * steel has to *become* transparent in place, not cross-fade to a diagram.
 * A Fresnel term keeps the silhouette and the grazing edges solid while the
 * face of the pipe dissolves, which reads as engineering rather than
 * hologram. `uXray` is driven per pipe run so only the run the camera is
 * inspecting opens up.
 */
export type ShellMaterial = THREE.MeshStandardMaterial & {
  userData: { uXray: { value: number } };
};

export function createShell(
  params: THREE.MeshStandardMaterialParameters = {},
): ShellMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: 0x555c66,
    metalness: 0.92,
    roughness: 0.42,
    side: THREE.DoubleSide,
    transparent: true,
    ...params,
  }) as ShellMaterial;

  const uXray = { value: 0 };
  m.userData = { uXray };

  m.onBeforeCompile = (shader) => {
    shader.uniforms.uXray = uXray;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vShellPos;
         varying vec3 vShellNrm;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vShellPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
         vShellNrm = normalize( mat3( modelMatrix ) * objectNormal );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uXray;
         varying vec3 vShellPos;
         varying vec3 vShellNrm;
         float xFres;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `vec4 diffuseColor = vec4( diffuse, opacity );
         {
           vec3 vDir = normalize( cameraPosition - vShellPos );
           xFres = pow( 1.0 - abs( dot( normalize( vShellNrm ), vDir ) ), 2.2 );
           diffuseColor.a *= mix( 1.0, 0.045 + xFres * 0.92, uXray );
         }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += vec3( 0.10, 0.30, 0.42 ) * xFres * uXray * 1.6;`,
      );
  };

  // Force a distinct program so two shells never share a compiled shader.
  m.customProgramCacheKey = () => "elva-shell";
  return m;
}

/** Opaque structural steel — frames, floor, skids, brackets. */
export function createSteel(params: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0x3a4048,
    metalness: 0.78,
    roughness: 0.62,
    ...params,
  });
}

/**
 * Wet steel. The aftermath must leave evidence, so surfaces gain gloss and a
 * cold cast once the suppressant has passed over them rather than snapping
 * back to a clean factory.
 */
export function applyWetness(m: THREE.MeshStandardMaterial, wet: number) {
  m.roughness = THREE.MathUtils.lerp(0.62, 0.16, wet);
  m.envMapIntensity = 1 + wet * 0.8;
}

/** A soft radial sprite, generated once and shared by every particle system. */
let sprite: THREE.Texture | null = null;
export function radialSprite(): THREE.Texture {
  if (sprite) return sprite;
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  sprite = new THREE.CanvasTexture(c);
  sprite.colorSpace = THREE.SRGBColorSpace;
  return sprite;
}
