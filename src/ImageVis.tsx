import {
  VisCanvas,
  PanZoomMesh,
  ScaleType,
  ColorBar,
  ColorMap,
  Domain,
  useAxisSystemContext,
} from '@h5web/lib';
import styles from './ImageVis.module.css';
import { useThree, useFrame } from '@react-three/fiber';
import { useState, useMemo } from 'react';
import { scaleLinear } from '@visx/scale';

export declare type Shape = [number, number];

interface MyMeshProps {
  dataShape: Shape;
  abscissaDomain: Domain;
  ordinateDomain: Domain;
}

function getIntersectionDomain(
  domains: (Domain | undefined)[]
): Domain | undefined {
  const domainsToCombine = domains.filter((d) => d !== undefined);
  if (domainsToCombine.length === 0) {
    return undefined;
  }

  return domainsToCombine.reduce((accDomain, nextDomain) => {
    if (accDomain === undefined || nextDomain === undefined) {
      return undefined;
    }
    const [accMin, accMax] = accDomain;
    const [nextMin, nextMax] = nextDomain;
    if (nextMax < accMin || accMax < nextMin) {
      return undefined; // no intersection
    }
    return [Math.max(accMin, nextMin), Math.min(accMax, nextMax)];
  });
}

function normalizeToDomain(value: number, domain: Domain): number {
  return (value - domain[0]) / (domain[1] - domain[0]);
}

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
  // re-render on zoom&pan
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
  const canvasSize = useThree((state) => state.size);
  const { width, height } = canvasSize;

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

interface VisibleLODSlice {
  levelOfDetail: number;
  xSlice: Domain; // Slice for base LOD as [begin, end[
  ySlice: Domain; // Slice for base LOD as [begin, end[
  xLODSlice: Domain; // Slice at given LOD as [begin, end[
  yLODSlice: Domain; // Slice at given LOD as [begin, end[
}

function getVisibleLODSlice(
  dataShape: Shape,
  abscissaDomain: Domain,
  ordinateDomain: Domain,
  visibleExtent: VisibleExtent | undefined
): VisibleLODSlice | undefined {
  if (visibleExtent === undefined) {
    return undefined;
  }
  const xVisibleData = getIntersectionDomain([
    visibleExtent.xDomain,
    abscissaDomain,
  ]);
  const yVisibleData = getIntersectionDomain([
    visibleExtent.yDomain,
    ordinateDomain,
  ]);
  if (xVisibleData === undefined || yVisibleData === undefined) {
    return undefined; // No visible data
  }

  const [rows, cols] = dataShape;
  const xBinPerData = rows / (abscissaDomain[1] - abscissaDomain[0]);
  const yBinPerData = cols / (ordinateDomain[1] - ordinateDomain[0]);

  const xBinPerPixel = xBinPerData * visibleExtent.xDataPerPixel;
  const yBinPerPixel = yBinPerData * visibleExtent.yDataPerPixel;
  const lod = Math.max(1, Math.floor(Math.min(xBinPerPixel, yBinPerPixel)));

  // convert visible image data to array slice at given LOD
  const xSlice: Domain = [
    Math.floor(rows * normalizeToDomain(xVisibleData[0], abscissaDomain)),
    Math.ceil(rows * normalizeToDomain(xVisibleData[1], abscissaDomain)) + 1,
  ];
  const ySlice: Domain = [
    Math.floor(cols * normalizeToDomain(yVisibleData[0], ordinateDomain)),
    Math.ceil(cols * normalizeToDomain(yVisibleData[1], ordinateDomain)) + 1,
  ];

  const xLODSlice: Domain = [
    Math.floor(
      (rows / lod) * normalizeToDomain(xVisibleData[0], abscissaDomain)
    ),
    Math.min(
      Math.ceil(
        (rows / lod) * normalizeToDomain(xVisibleData[1], abscissaDomain)
      ) + 1,
      Math.floor(rows / lod)
    ),
  ];
  const yLODSlice: Domain = [
    Math.floor(
      (cols / lod) * normalizeToDomain(yVisibleData[0], ordinateDomain)
    ),
    Math.min(
      Math.ceil(
        (cols / lod) * normalizeToDomain(yVisibleData[1], ordinateDomain)
      ) + 1,
      Math.floor(cols / lod)
    ),
  ];
  return {
    levelOfDetail: lod,
    xSlice,
    ySlice,
    xLODSlice,
    yLODSlice,
  };
}

function MyMesh(props: MyMeshProps) {
  const { dataShape, abscissaDomain, ordinateDomain } = props;

  const xDataToArrayScale = useMemo(
    () =>
      scaleLinear({
        domain: abscissaDomain,
        range: [0, dataShape[0]],
      }),
    [abscissaDomain, dataShape]
  );
  const yDataToArrayScale = useMemo(
    () =>
      scaleLinear({
        domain: ordinateDomain,
        range: [0, dataShape[1]],
      }),
    [ordinateDomain, dataShape]
  );

  const { visSize, abscissaScale, ordinateScale, ordinateConfig } =
    useAxisSystemContext();
  const { zoom } = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);

  const visibleExtent = useVisibleExtent();
  const visibleSlice = getVisibleLODSlice(
    dataShape,
    abscissaDomain,
    ordinateDomain,
    visibleExtent
  );
  if (visibleSlice === undefined) {
    return null; // nothing to display
  }
  console.log(
    'lod',
    visibleSlice.levelOfDetail,
    'x',
    visibleSlice.xSlice,
    'y',
    visibleSlice.ySlice
  );

  const [rows, cols] = dataShape;

  // Convert visibleSlice to coordinates to display the mesh
  // TODO fix offset hack and find root cause
  const xMeshMin =
    abscissaScale(xDataToArrayScale.invert(visibleSlice.xSlice[0])) +
    (visibleSlice.xSlice[0] === 0 && visibleSlice.xSlice[1] === rows + 1
      ? visSize.width / 2
      : width / (2 * zoom));
  const xMeshMax =
    abscissaScale(xDataToArrayScale.invert(visibleSlice.xSlice[1])) +
    (visibleSlice.xSlice[0] === 0 && visibleSlice.xSlice[1] === rows + 1
      ? visSize.width / 2
      : width / (2 * zoom));
  const yMeshMin =
    ordinateScale(yDataToArrayScale.invert(visibleSlice.ySlice[0])) +
    (visibleSlice.ySlice[0] === 0 && visibleSlice.ySlice[1] === cols + 1
      ? visSize.height / 2
      : height / (2 * zoom));
  const yMeshMax =
    ordinateScale(yDataToArrayScale.invert(visibleSlice.ySlice[1])) +
    (visibleSlice.ySlice[0] === 0 && visibleSlice.ySlice[1] === cols + 1
      ? visSize.height / 2
      : height / (2 * zoom));
  console.log('coords', xMeshMin, xMeshMax, yMeshMin, yMeshMax);

  const shader = {
    uniforms: {
      niteration: { value: 500 },
      offset: { type: 'v', value: [-2, -1.5] },
      size: { type: 'v', value: [3, 3] },
    },
    vertexShader: `
      varying vec2 coords;

      void main() {
        coords = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform int niteration;
      uniform vec2 offset;
      uniform vec2 size;

      varying vec2 coords;

      float mandelbrot(vec2 c) {
        vec2 z = vec2(c.x, c.y);
        int index;
        for (index=0; index<=niteration; index++) {
          z = vec2(z.x*z.x - z.y*z.y, 2.0 * z.x * z.y) + c;
        }

        return (z.x*z.x + z.y*z.y) <= 4.0 ? float(index) : 0.0;
      }

      void main() {
        float value = mandelbrot(coords * size + offset);
        float intensity = value / float(niteration);
        gl_FragColor = vec4(intensity, intensity, intensity, 1.);
        //gl_FragColor = vec4(coords.x <= 0.5 ? 0. : 1., coords.y<=0.5 ? 0.: 1., 0, 1);
      }
    `,
  };

  return (
    <mesh
      scale={[1, ordinateConfig.flip ? -1 : 1, 1]}
      position={[xMeshMin, yMeshMin, 0]}
    >
      <planeGeometry args={[xMeshMax - xMeshMin, yMeshMax - yMeshMin]} />
      <shaderMaterial args={[shader]} />
    </mesh>
  );
}

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
