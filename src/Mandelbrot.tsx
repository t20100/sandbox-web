import { VisCanvas, PanZoomMesh, useAxisSystemContext } from '@h5web/lib';
import { useThree } from '@react-three/fiber';

function MandelbrotMesh() {
  const {
    abscissaScale,
    ordinateScale,
    ordinateConfig,
  } = useAxisSystemContext();

  const { position, zoom } = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  const xMinVisible = abscissaScale.invert(-width / (2 * zoom) + position.x);
  const xMaxVisible = abscissaScale.invert(width / (2 * zoom) + position.x);
  const yMinVisible = ordinateScale.invert(-height / (2 * zoom) + position.y);
  const yMaxVisible = ordinateScale.invert(height / (2 * zoom) + position.y);

  const shader = {
    uniforms: {
      niteration: { value: 100 },
      offset: {
        type: 'v',
        value: [xMinVisible, yMinVisible],
      },
      size: {
        type: 'v',
        value: [xMaxVisible - xMinVisible, yMaxVisible - yMinVisible],
      },
    },
    vertexShader: `
      varying vec2 coords;

      void main() {
        coords = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      varying vec2 coords;

      uniform int niteration;
      uniform vec2 offset;
      uniform vec2 size;

      int mandelbrot(vec2 c) {
        vec2 z = vec2(c.x, c.y);
        int stop = 0;
        for (int index=0; index<=niteration; index++) {
          z = vec2(z.x*z.x - z.y*z.y, 2.0 * z.x * z.y) + c;
          if ((z.x*z.x + z.y*z.y) <= 4.0) {
            stop = index;
          }
        }

        return stop;
      }

      void main() {
        int value = mandelbrot(coords * size + offset);
        float intensity = log(1.0 + float(value)) / log(1.0 + float(niteration));
        gl_FragColor = vec4(intensity, intensity, intensity, 1.0);
      }
    `,
  };

  return (
    <mesh
      scale={[1, ordinateConfig.flip ? -1 : 1, 1]}
      position={[position.x, position.y, 0]}
    >
      <planeGeometry args={[width, height]} />
      <shaderMaterial args={[shader]} />
    </mesh>
  );
}

function MandelbrotVis() {
  return (
    <VisCanvas
      abscissaConfig={{
        visDomain: [-2.5, 1.5],
        showGrid: false,
      }}
      ordinateConfig={{
        visDomain: [-2, 2],
        showGrid: false,
      }}
      visRatio={1}
      title="Mandelbrot"
    >
      <PanZoomMesh />
      <MandelbrotMesh />
    </VisCanvas>
  );
}

export default MandelbrotVis;
