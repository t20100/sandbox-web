import ndarray, { NdArray } from 'ndarray';
import { fromArrayBuffer } from 'numpy-parser';
import axios, { AxiosInstance } from 'axios';
import {
  VisCanvas,
  PanZoomMesh,
  HeatmapMesh,
  ScaleType,
  ColorBar,
  ColorMap,
  Domain,
} from '@h5web/lib';
import { useEffect, useState } from 'react';
import './App.css';
import Slider from '@material-ui/core/Slider';
import HeatmapLODVis from './HeatmapLODVis';
import MandelbrotVis from './Mandelbrot';

class H5DataProvider {
  public readonly filepath: string;
  protected readonly client: AxiosInstance;

  public constructor(url: string, filepath: string) {
    this.filepath = filepath;
    this.client = axios.create({
      baseURL: `${url}`,
    });
  }

  public async getValue(path: string, selection?: string): Promise<unknown> {
    const { data } = await this.client.get<unknown>(
      `/data/${this.filepath}?path=${path}${
        selection && `&selection=${selection}`
      }`
    );
    console.log(data);
    // const { data, shape } = fromArrayBuffer(response);
    // return ndarray(data, shape);
    return 1;
  }
}

interface Props {
  dataArray: NdArray;
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
    colorMap = 'Viridis',
    invertColorMap = false,
  } = props;

  const [rows, cols] = dataArray.shape;
  const abscissaConfig = {
    visDomain: [0, rows - 1] as Domain,
    showGrid: false,
  };
  const ordinateConfig = {
    visDomain: [0, cols - 1] as Domain,
    showGrid: false,
  };

  return (
    <VisCanvas
      abscissaConfig={abscissaConfig}
      ordinateConfig={ordinateConfig}
      // aspectRatio={1}
      title={title}
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
function npRandom(shape: number[]): NdArray<Float32Array> {
  const size = shape.reduce(
    (accumulator, currentValue) => accumulator * currentValue
  );
  const array = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = Math.random();
  }
  return ndarray(array, shape);
}

// download

async function npyFetch(url: string): Promise<NdArray> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const { data, shape } = fromArrayBuffer(arrayBuffer);
  return ndarray(data, shape);
}

/*
const imageURL =
  'http://localhost:5000/npy/data/public/image.npy?ixstr=100:200,:50';
const image2URL = 'http://localhost:5000/npy/data/public/image2.npy';
*/

const h5file = 'public/data/BM18/MRI3D.h5';
const h5path = '/data_128';
const rootURL = 'http://localhost:8888';
const dataURL = `${rootURL}/data/`;
const metaURL = `${rootURL}/meta/`;
const statsURL = `${rootURL}/stats/`;

// Data hook
/*
function useData(timeout: number): [NdArray, Domain] {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + 1);
    }, timeout);
    return () => clearInterval(interval);
  }, [timeout]);
  return count % 2 === 0 ? [dataArray, domain] : [dataArray2, domain2];
}
*/

function useSliceData(
  h5file: string,
  h5path: string,
  dim: number
): [NdArray, (newValue: number) => void] {
  const [slice, setSlice] = useState(-1);
  const [data, setData] = useState(ndarray(new Float32Array(0), [0, 0]));
  function setNewSlice(newValue: number) {
    if (newValue !== slice) {
      setSlice(newValue);
      /* const selection = `${':,'.repeat(dim)}${newValue}`;
      npyFetch(
        `${dataURL}${h5file}?path=${h5path}&selection=${selection}&format=npy`
      ).then(setData);*/
      setData(npRandom([128, 128]));
    }
  }
  return [data, setNewSlice];
}

function App() {
  const scaleType = ScaleType.Linear;
  const colorMap = 'Greys';
  const invertColorMap = true;
  const axialDim = 0;
  const frontDim = 1;
  const sideDim = 2;

  const [domain, setDomain] = useState([0, 1] as Domain);

  const [dataAxial, setNewSliceAxial] = useSliceData(h5file, h5path, axialDim);
  const [dataFront, setNewSliceFront] = useSliceData(h5file, h5path, frontDim);
  const [dataSide, setNewSliceSide] = useSliceData(h5file, h5path, sideDim);

  /* const [shape, setShape] = useState([0, 0, 0]);*/
  const [shape, setShape] = useState([128, 128, 128]);
  useEffect(() => {
    if (shape[0] === 0) {
      Promise.all([
        axios.get(`${metaURL}${h5file}?path=${h5path}`),
        axios.get(`${statsURL}${h5file}?path=${h5path}`),
      ]).then((values) => {
        const { shape } = values[0].data;
        setShape(shape);
        setNewSliceAxial(Math.round(shape[0] / 2));
        setNewSliceSide(Math.round(shape[1] / 2));
        setNewSliceFront(Math.round(shape[2] / 2));
        setDomain([values[1].data.min, values[1].data.max] as Domain);
      });
    }
  });

  const [activeTab, setActiveTab] = useState('Mandelbrot');

  return (
    <div>
      <div className="Tabs">
        <button
          type="button"
          style={{ fontWeight: activeTab !== '3D' ? undefined : 'bold' }}
          onClick={() => {
            setActiveTab('3D');
          }}
        >
          3D
        </button>
        <button
          type="button"
          style={{
            fontWeight: activeTab !== 'Mandelbrot' ? undefined : 'bold',
          }}
          onClick={() => {
            setActiveTab('Mandelbrot');
          }}
        >
          Mandelbrot
        </button>
        <button
          type="button"
          style={{ fontWeight: activeTab !== '2D' ? undefined : 'bold' }}
          onClick={() => {
            setActiveTab('2D');
          }}
        >
          2D
        </button>
      </div>
      {activeTab === '2D' && (
        <div className="ImageViewer">
          <HeatmapLODVis
            dataShape={[150_000, 150_000]}
            abscissaDomain={[-2.5, 1.5]}
            ordinateDomain={[-2, 2]}
            domain={domain}
            title="Radio"
            scaleType={scaleType}
            colorMap={colorMap}
            invertColorMap={invertColorMap}
          />
        </div>
      )}
      {activeTab === 'Mandelbrot' && (
        <div className="MandelbrotDemo">
          <MandelbrotVis />
        </div>
      )}
      {activeTab === '3D' && (
        <div className="SlideViewer">
          <div className="Tools">
            <Slider
              orientation="vertical"
              defaultValue={0}
              aria-labelledby="axial-slider"
              valueLabelDisplay="on"
              step={1}
              marks
              min={0}
              max={shape[axialDim] - 1}
              onChange={(event, newValue) =>
                setNewSliceAxial(newValue as number)
              }
            />
            <SliceVis
              dataArray={dataAxial}
              domain={domain}
              title="Axial"
              scaleType={scaleType}
              colorMap={colorMap}
              invertColorMap={invertColorMap}
            />
          </div>
          <div className="Tools">
            <ColorBar
              domain={domain}
              scaleType={scaleType}
              colorMap={colorMap}
              invertColorMap={invertColorMap}
              withBounds
            />
          </div>
          <div className="Tools">
            <Slider
              orientation="vertical"
              defaultValue={0}
              aria-labelledby="front-slider"
              valueLabelDisplay="on"
              step={1}
              marks
              min={0}
              max={shape[frontDim] - 1}
              onChange={(event, newValue) =>
                setNewSliceFront(newValue as number)
              }
            />
            <SliceVis
              dataArray={dataFront}
              domain={domain}
              title="Front"
              scaleType={scaleType}
              colorMap={colorMap}
              invertColorMap={invertColorMap}
            />
          </div>
          <div className="Tools">
            <SliceVis
              dataArray={dataSide}
              domain={domain}
              title="Side"
              scaleType={scaleType}
              colorMap={colorMap}
              invertColorMap={invertColorMap}
            />
            <Slider
              orientation="vertical"
              defaultValue={0}
              aria-labelledby="side-slider"
              valueLabelDisplay="on"
              step={1}
              marks
              min={0}
              max={shape[sideDim] - 1}
              onChange={(event, newValue) =>
                setNewSliceSide(newValue as number)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
