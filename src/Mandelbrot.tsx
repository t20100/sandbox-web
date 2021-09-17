import {
  VisCanvas,
  PanZoomMesh,
  Domain,
  useAxisSystemContext,
} from '@h5web/lib';
import styles from './HeatmapLODVis.module.css';
import { useThree, useFrame } from '@react-three/fiber';
import { useState } from 'react';

interface VisibleExtent {
  x: number;
  y: number;
  width: number;
  height: number;
  xDomain: Domain;
  yDomain: Domain;
  xDataPerPixel: number;
  yDataPerPixel: number;
}

function useVisibleExtent(): VisibleExtent {
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

  const { abscissaScale, ordinateScale } = useAxisSystemContext();

  const { position, zoom } = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  // Find visible domains from camera's zoom and position
  const xMin = abscissaScale.invert(-width / (2 * zoom) + position.x);
  const xMax = abscissaScale.invert(width / (2 * zoom) + position.x);
  const yMin = ordinateScale.invert(-height / (2 * zoom) + position.y);
  const yMax = ordinateScale.invert(height / (2 * zoom) + position.y);

  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
    xDomain: [xMin, xMax],
    yDomain: [yMin, yMax],
    xDataPerPixel: (xMax - xMin) / width,
    yDataPerPixel: (yMax - yMin) / height,
  };
}

function MandelbrotMesh() {
  const visibleExtent = useVisibleExtent();
  const { zoom } = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  const {
    abscissaScale,
    ordinateScale,
    ordinateConfig,
  } = useAxisSystemContext();

  const xMin = abscissaScale(visibleExtent.xDomain[0]) + width / (2 * zoom);
  const xMax = abscissaScale(visibleExtent.xDomain[1]) + width / (2 * zoom);
  const yMin = ordinateScale(visibleExtent.yDomain[0]) + height / (2 * zoom);
  const yMax = ordinateScale(visibleExtent.yDomain[1]) + height / (2 * zoom);

  const shader = {
    uniforms: {
      niteration: { value: 100 },
      offset: {
        type: 'v',
        value: [visibleExtent.x, visibleExtent.y],
      },
      size: {
        type: 'v',
        value: [visibleExtent.width, visibleExtent.height],
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
