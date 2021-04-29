#!/bin/env python
# coding: utf-8

import io
try:
    import orjson as json
except ImportError:
    import json
import os
from flask import Flask, request, send_from_directory, send_file
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS
from flask_compress import Compress

import h5py
import hdf5plugin
import numpy

from jupyterlab_hdf.util import dsetChunk, hobjMetaDict, jsonize


ROOT_DIR = os.path.abspath(os.path.dirname(__file__))

# Init app
app = Flask(__name__)
CORS(app)

if False:  # HTTP compression for data
    # See https://github.com/colour-science/flask-compress
    #app.config["COMPRESS_REGISTER"] = False  # disable default compression of all eligible requests
    app.config["COMPRESS_MIMETYPES"] = ['application/octet-stream']
    compress = Compress()
    compress.init_app(app)


# Serve hdf5 file
@app.route('/hdf/data/<path:fpath>')
def server_hdf5_content(fpath):
    uri = request.args.get('uri', '/')
    ixstr = request.args.get('ixstr', None)

    with h5py.File(os.path.join(ROOT_DIR, fpath), mode='r') as f:
        data = dsetChunk(f[uri], ixstr)

    # Send data as a npy file
    buffer = io.BytesIO()
    numpy.save(buffer, data)
    buffer.seek(0)
    return send_file(buffer, mimetype='application/octet-stream')

@app.route('/hdf/meta/<path:fpath>')
def server_hdf5_meta(fpath):
    uri = request.args.get('uri', '/')
    ixstr = request.args.get('ixstr', None)

    with h5py.File(os.path.join(ROOT_DIR, fpath), mode='r') as f:
         return json.dumps(jsonize(hobjMetaDict(f[uri], ixstr=ixstr)))

@app.route('/hdf/stats/<path:fpath>')
def server_hdf5_stats(fpath):
    uri = request.args.get('uri', '/')
    ixstr = request.args.get('ixstr', None)

    with h5py.File(os.path.join(ROOT_DIR, fpath), mode='r') as f:
        data = dsetChunk(f[uri], ixstr)

    return json.dumps({
        'nanmin': float(numpy.nanmin(data)),
        'nanmax': float(numpy.nanmax(data)),
        'nanmean': float(numpy.nanmean(data)),
        'nanstd': float(numpy.nanstd(data)),
    })

# Serve numpy file
@app.route('/npy/data/<path:fpath>')
def server_numpy_content(fpath):
    ixstr = request.args.get('ixstr', None)

    if ixstr is None:
        return send_from_directory(ROOT_DIR, fpath)
    else:
        data = dsetChunk(numpy.load(os.path.join(ROOT_DIR, fpath)), ixstr)
        buffer = io.BytesIO()
        numpy.save(buffer, data)
        buffer.seek(0)
        return send_file(buffer, mimetype='application/octet-stream')


# Websocket
# TODO
socketio = SocketIO(app)

@socketio.on('json')
def handle_json(json):
    print('received json: ' + str(json))
    # send

@socketio.on('get_data')
def handle_get_data(json):
    print('handle get_data: ' + str(json))
    # emit('data', xxx)

@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app)
