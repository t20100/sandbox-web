import {
  VisCanvas,
  PanZoomMesh,
  ScaleType,
  ColorBar,
  ColorMap,
  Domain,
  useAxisSystemContext,
  VisMesh,
} from '@h5web/lib';
import styles from './ImageVis.module.css';
import { useThree, useFrame } from '@react-three/fiber';
import { useState } from 'react';

export declare type Shape = [number, number];

interface Props {
  dataShape: Shape;
  abscissaDomain?: Domain;
  ordinateDomain?: Domain;
  domain: Domain;
  title?: string;
  scaleType?: ScaleType;
  colorMap?: ColorMap;
  invertColorMap?: boolean;
}

interface MyMeshProps {
  dataShape: Shape;
  abscissaDomain: Domain;
  ordinateDomain: Domain;
}

function intersectDomain(domain1: Domain, domain2: Domain): Domain | null {
  const [d1min, d1max] = domain1;
  const [d2min, d2max] = domain2;
  if (d1min > d2min) {
    return intersectDomain(domain2, domain1);
  }
  // So d1min <= d2min
  if (d2max <= d1max) {
    return domain2; // domain2 inside domain1
  }
  if (d1max < d2min) {
    return null; // no intersection
  }
  return [d2min, d1max];
}

function normalizeToDomain(value: number, domain: Domain): number {
  return (value - domain[0]) / (domain[1] - domain[0]);
}

function MyMesh(props: MyMeshProps) {
  const { dataShape, abscissaDomain, ordinateDomain } = props;

  const shader = {
    uniforms: {},
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(1, 0, 0, 1);
      }
    `,
  };

  const [previous_zoom, setZoom] = useState(1);
  const [previous_position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useFrame((state) => {
    // re-render on zoom&pan
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

  // Get plot visible area in data and pixels
  const {
    abscissaScale,
    ordinateScale,
    ordinateConfig,
  } = useAxisSystemContext();

  const { position, zoom } = useThree((state) => state.camera);
  const canvasSize = useThree((state) => state.size);
  const { width, height } = canvasSize;

  // Find visible domains from camera's zoom and position
  const xVisibleDomain: Domain = [
    abscissaScale.invert(-width / (2 * zoom) + position.x),
    abscissaScale.invert(width / (2 * zoom) + position.x),
  ];

  const yVisibleDomain: Domain = [
    ordinateScale.invert(-height / (2 * zoom) + position.y),
    ordinateScale.invert(height / (2 * zoom) + position.y),
  ];

  // Get visible image data area
  const [rows, cols] = dataShape;

  const visibleData = {
    x: intersectDomain(xVisibleDomain, abscissaDomain),
    y: intersectDomain(yVisibleDomain, ordinateDomain),
  };

  if (visibleData.x === null || visibleData.y === null) {
    return null; // Nothing to display
  }

  // Compute level of details to use
  const binPerData = {
    x: rows / (abscissaDomain[1] - abscissaDomain[0]),
    y: cols / (ordinateDomain[1] - ordinateDomain[0]),
  };

  const [xMin, xMax] = xVisibleDomain;
  const [yMin, yMax] = yVisibleDomain;
  const dataPerPixel = { x: (xMax - xMin) / width, y: (yMax - yMin) / height };

  const binPerPixel = {
    x: binPerData.x * dataPerPixel.x,
    y: binPerData.y * dataPerPixel.y,
  };
  const lod = Math.max(1, Math.floor(Math.min(binPerPixel.x, binPerPixel.y)));

  // convert visible image data to array slice
  const visibleSlice = {
    x: [
      Math.floor(
        (rows / lod) * normalizeToDomain(visibleData.x[0], abscissaDomain)
      ),
      Math.ceil(
        (rows / lod) * normalizeToDomain(visibleData.x[1], abscissaDomain)
      ),
    ],
    y: [
      Math.floor(
        (cols / lod) * normalizeToDomain(visibleData.y[0], ordinateDomain)
      ),
      Math.ceil(
        (cols / lod) * normalizeToDomain(visibleData.y[1], ordinateDomain)
      ),
    ],
  };
  console.log('lod', lod, 'x', visibleSlice.x, 'y', visibleSlice.y);

  // Convert visibleSlice to coordinates to display the mesh

  return (
    <VisMesh scale={[1, ordinateConfig.flip ? -1 : 1, 1]}>
      <shaderMaterial args={[shader]} />
    </VisMesh>
  );
}

function ImageVis(props: Props) {
  const {
    dataShape,
    abscissaDomain,
    ordinateDomain,
    domain,
    title,
    scaleType = ScaleType.Linear,
    colorMap = 'Viridis',
    invertColorMap = false,
  } = props;

  const [rows, cols] = dataShape;
  const abscissaDomainDefined = abscissaDomain || [0, rows];
  const ordinateDomainDefined = ordinateDomain || [0, cols];

  return (
    <figure className={styles.root}>
      <VisCanvas
        abscissaConfig={{
          visDomain: abscissaDomainDefined,
          showGrid: false,
          label: 'Horizontal',
        }}
        ordinateConfig={{
          visDomain: ordinateDomainDefined,
          showGrid: false,
          label: 'Vertical',
        }}
        visRatio={cols / rows}
        title={title}
      >
        <PanZoomMesh />
        <MyMesh
          dataShape={dataShape}
          abscissaDomain={abscissaDomainDefined}
          ordinateDomain={ordinateDomainDefined}
        />
      </VisCanvas>
      <ColorBar
        domain={domain}
        scaleType={scaleType}
        colorMap={colorMap}
        invertColorMap={invertColorMap}
        withBounds
      />
    </figure>
  );
}

export type { Props as ImageVisProps };
export default ImageVis;
