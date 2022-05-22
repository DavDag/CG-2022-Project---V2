#version 300 es

precision highp float;

/**
 * Based on this great tutorial:
 * https://www.youtube.com/watch?v=Rl3clbrsI40&ab_channel=NordicBeaver 
 *
 * And some theory:
 * https://thebookofshaders.com/
 */

#define SEED_1 25619.88321
#define SEED_2 124.923
#define SEED_3 17.824
#define SEED_4 1820.397
#define SEED_5 8923.84

#define RND_NUMBER 442.8776
#define RND_2D_VEC vec2(5918.3220, 92.8755)

#define DROP_CELL_RES 20.0
#define DROP_PRESENCE 20
#define DROP_INTENSITY 20.0
#define DROP_SPEED 40.0

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uViewPos;

in vec2 fTex;

/**
 *
 * This method is based on the principle that function based on a seed "have memory".
 *
 * By repeating the same algorithm with the same seeds and only moving by time, we can have a continuous flow.
 *
 */

// Generate a pseudo-random float with 1D input
float Random11(float inputValue, float seed) {
  return fract(sin(inputValue * RND_NUMBER) * seed);
}

// Generate a pseudo-random float with 2D input
float Random21(vec2 inputValue, float seed) {
  return fract(sin(dot(inputValue, RND_2D_VEC)) * seed);
}

// Main functions.
vec2 Drop(vec2 uvs, float seedBase) {
  // Apply a "random" deviation on the y axis
  float shiftY = Random11(SEED_1, seedBase);
  // uvs.y += shiftY;
  uvs.y += shiftY * uTime * DROP_SPEED;

  // Split into "cells"
  uvs *= DROP_CELL_RES;

  // Apply a "random" deviation on the x axis
  float shiftX = Random11(floor(uvs.y), seedBase);
  uvs.x += shiftX;

  // Retrieve "per-drop" index and uvs
  vec2 dropIndex = floor(uvs);
  vec2 dropUvs = fract(uvs);

  // Compute distance from the center
  float dist = distance(dropUvs, vec2(0.5));

  // Check if uvs are "inside"
  float isInside = 1.0 - step(0.1, dist);

  // "Randomly" remove some drops
  float hidden = step(0.8, Random21(dropIndex, seedBase + SEED_2));

  // Add intensity based on time-alive
  float intensity = 1.0 - fract(uTime * 0.5 + Random21(dropIndex, seedBase + SEED_3));
  intensity = sign(intensity) * (intensity * intensity * intensity * intensity);
  intensity = clamp(intensity, 0.0, 1.0);

  // Retrieve a vector to the center
  vec2 vecToCenter = normalize(vec2(0.5) - dropUvs);

  // "Create" drop
  vec2 drop = vecToCenter * dist * dist * DROP_INTENSITY;
  drop *= hidden;
  drop *= intensity;
  drop *= isInside;

  // Result
  return drop;
}

// Lens distortion
vec2 lens(vec2 uvs) {
    float k = -0.5;
    float kcube = 0.5;
    float r2 = (uvs.x - 0.5) * (uvs.x - 0.5) + (uvs.y - 0.5) * (uvs.y - 0.5);
    float f = 1.0 + r2 * (k + kcube * sqrt(r2));
    return f * (uvs.xy - 0.5) + 0.5;
}

out vec4 oCol;

void main() {
  // Store texture coordinates
  vec2 uvs = fTex;
  
  // Repeat multiple times to "accumulate" drops
  vec2 drops = vec2(0);
  for (int d = 0; d < DROP_PRESENCE; ++d) {
    drops += Drop(uvs, SEED_4 + float(d) * SEED_5);
  }

  // Drops are simply a distortion
  uvs += drops;

  // Lens effect
  uvs = lens(uvs);

  // Sample color and return !
  vec3 color = textureLod(uTexture, uvs, 0.0).rgb;
  oCol = vec4(color, 1);

  // // To see "random" results (and ensure there are no patterns)
  // float r1 = Random21(uvs, SEED_1);
  // oCol = vec4(vec3(r1), 1.0);
}
