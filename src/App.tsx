
import ndarray from 'ndarray';
import fromArrayBuffer from 'numpy-parser';
import axios from 'axios';
import { VisCanvas, PanZoomMesh, HeatmapMesh, ScaleType, ColorBar, ColorMap, Domain } from '@h5web/lib';
import { useEffect, useState } from 'react';
import './App.css';

interface Props {
  dataArray: ndarray;
  domain: Domain;
  title?: string;
  scaleType?: ScaleType;
  colorMap?: ColorMap;
  invertColorMap?: boolean;
}

function SliceVis(props: Props) {
  const {
    dataArray,
    domain,
    title,
    scaleType = ScaleType.Linear,
    colorMap = "Viridis",
    invertColorMap = false,
  } = props;

  const [rows, cols] = dataArray.shape
  const abscissaConfig = {
    domain: [0, rows-1] as Domain,
    showGrid: false,
  };
  const ordinateConfig = {
    domain: [0, cols-1] as Domain,
    showGrid: false,
  };

  return (
    <VisCanvas
      abscissaConfig={abscissaConfig}
      ordinateConfig={ordinateConfig}
      aspectRatio={1}
      canvasTitle={title}
      >
      <PanZoomMesh />
      <HeatmapMesh
        rows={rows}
        cols={cols}
        values={dataArray.data as number[]}
        domain={domain}
        colorMap={colorMap}
        scaleType={scaleType}
        invertColorMap={invertColorMap}
      />
    </VisCanvas>
  );
}


// numpy like
function npRandom(shape: number[]) : ndarray {
  const size = shape.reduce((accumulator, currentValue) => accumulator * currentValue);
  let array = new Float32Array(size);
  for (var i: number=0; i<size; i++) {
    array[i] = Math.random();
  }
  return ndarray(array, shape);
}

// download
async function npyFetch(url: string) : Promise<ndarray> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const { data, shape } = fromArrayBuffer(arrayBuffer);
  return ndarray(data, shape);
}

//Data hook
const dataArray = npRandom([2048, 2048]);
const domain: Domain = [0, 1];

const dataArray2 = npRandom([2048, 2048]);
const domain2: Domain = [0, 1];

function useData(timeout: number): [ndarray, Domain] {
  let [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {setCount(c => c + 1)}, timeout);
    return () => clearInterval(interval);
  }, [timeout]);
  return count % 2 === 0 ? [dataArray, domain] : [dataArray2, domain2];
}

const imageURL = "http://localhost:3000/image.npy";
axios.get(imageURL).then((response) => {
  console.log(response.data);
  npLoad(response.data);
  const { data, shape } = fromArrayBuffer(response.data);
}).catch((error) =>{
  console.log(error);
})

function App() {
  const [data, domain] = useData(1000);
  const scaleType = ScaleType.Linear;
  const colorMap = "Viridis";

  return (
    <div className="App">
      <SliceVis
        dataArray={data}
        domain={domain}
        title="Axial"
        scaleType={scaleType}
        colorMap={colorMap}
        invertColorMap={false}
      />
      <div className="Tools">
        <ColorBar
          domain={domain as Domain}
          scaleType={scaleType}
          colorMap={colorMap}
          invertColorMap={false}
          withBounds
        />
      </div>
      <SliceVis
        dataArray={dataArray}
        domain={domain as Domain}
        title="Front"
        scaleType={scaleType}
        colorMap={colorMap}
        invertColorMap={false}
      />
      <SliceVis
        dataArray={dataArray}
        domain={domain as Domain}
        title="Side"
        scaleType={scaleType}
        colorMap={colorMap}
        invertColorMap={false}
      />
    </div>
  );
}

export default App;
