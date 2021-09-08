import ndarray from 'ndarray';
import {
  VisCanvas,
  PanZoomMesh,
  HeatmapMesh,
  ScaleType,
  ColorBar,
  ColorMap,
  Domain,
  useAxisSystemContext,
} from '@h5web/lib';
import styles from './ImageVis.module.css';
import { useThree, useFrame } from '@react-three/fiber';
import { useState } from 'react';

interface Props {
  dataArray: ndarray;
  domain: Domain;
  title?: string;
  scaleType?: ScaleType;
  colorMap?: ColorMap;
  invertColorMap?: boolean;
}

function MyMesh() {
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
  const [previous_position, setPosition] = useState([0, 0]);

  useFrame((state) => {
    // re-render on zoom&pan
    const { position, zoom } = state.camera;
    if (zoom !== previous_zoom) {
      setZoom(zoom);
    }
    if (position !== previous_position) {
      setPosition(position);
    }
  });

  const axis = useAxisSystemContext();

  const three = useThree();
  console.log(
    axis,
    previous_position,
    'useThree:',
    three.camera.zoom,
    three.camera.left,
    three.camera.top
  );

  return (
    <mesh
      scale={[1, 1, 1]}
      onUpdate={() => {
        console.log('UPDATE');
      }}
    >
      <planeGeometry args={[100, 100]} />
      <shaderMaterial args={[shader]} />
    </mesh>
  );
}

interface ImageMeshProps {
  dataArray: ndarray;
  domain: Domain;
  scaleType?: ScaleType;
  colorMap?: ColorMap;
  invertColorMap?: boolean;
}

function ImageMesh(props: ImageMeshProps) {
  const {
    dataArray,
    domain,
    scaleType = ScaleType.Linear,
    colorMap = 'Viridis',
    invertColorMap = false,
  } = props;
  const [rows, cols] = dataArray.shape;

  console.log('RENDER');
  const { width, height } = useThree((state) => state.size);
  console.log('SIZE:', width, height);
  console.log('DONE');

  return (
    <HeatmapMesh
      rows={rows}
      cols={cols}
      values={dataArray.data as number[]}
      domain={domain}
      colorMap={colorMap}
      scaleType={scaleType}
      invertColorMap={invertColorMap}
    />
  );
}

function ImageVis(props: Props) {
  const {
    dataArray,
    domain,
    title,
    scaleType = ScaleType.Linear,
    colorMap = 'Viridis',
    invertColorMap = false,
  } = props;

  const [rows, cols] = dataArray.shape;

  return (
    <figure className={styles.root}>
      <VisCanvas
        abscissaConfig={{
          visDomain: [0, rows - 1] as Domain,
          showGrid: false,
          label: 'Horizontal',
        }}
        ordinateConfig={{
          visDomain: [0, cols - 1] as Domain,
          showGrid: false,
          label: 'Vertical',
        }}
        // aspectRatio={1}
        title={title}
      >
        <PanZoomMesh />
        <MyMesh />
        {/* <ImageMesh
          dataArray={dataArray}
          domain={domain}
          colorMap={colorMap}
          scaleType={scaleType}
          invertColorMap={invertColorMap}
        />*/}
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
