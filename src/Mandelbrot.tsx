import { VisCanvas, PanZoomMesh, useAxisSystemContext } from '@h5web/lib';
import styles from './HeatmapLODVis.module.css';
import { useThree, useFrame } from '@react-three/fiber';
import { useState } from 'react';

function MandelbrotMesh() {
  // re-render on zoom&pan: TODO issue here => 2 renderings
  const [previous_zoom, setZoom] = useState(1);
  const [previous_position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useFrame((state) => {
    const { position, zoom } = state.camera;
    if (zoom !== previous_zoom) {
      setZoom(zoom);
    }
    if (
      position.x !== previous_position.x ||
      position.y !== previous_position.y
    ) {
      setPosition(position.clone());
    }
  });

  const {
    abscissaScale,
    ordinateScale,
    ordinateConfig,
  } = useAxisSystemContext();

  const { position, zoom } = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  // Find visible domains from camera's zoom and position
  const xMinVisible = abscissaScale.invert(-width / (2 * zoom) + position.x);
  const xMaxVisible = abscissaScale.invert(width / (2 * zoom) + position.x);
  const yMinVisible = ordinateScale.invert(-height / (2 * zoom) + position.y);
  const yMaxVisible = ordinateScale.invert(height / (2 * zoom) + position.y);

  const xMin = abscissaScale(xMinVisible) + width / (2 * zoom);
  const xMax = abscissaScale(xMaxVisible) + width / (2 * zoom);
  const yMin = ordinateScale(yMinVisible) + height / (2 * zoom);
  const yMax = ordinateScale(yMaxVisible) + height / (2 * zoom);

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
      position={[xMin, yMin, 0]}
    >
      <planeGeometry args={[xMax - xMin, yMax - yMin]} />
      <shaderMaterial args={[shader]} />
    </mesh>
  );
}

function MandelbrotVis() {
  return (
    <figure className={styles.root}>
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
    </figure>
  );
}

export default MandelbrotVis;
