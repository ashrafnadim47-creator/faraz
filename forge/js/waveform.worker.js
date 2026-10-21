/* FORGE — waveform peak computation worker */
self.onmessage = (e) => {
  try {
    const { channelData, buckets } = e.data;
    const data = channelData;
    const peaks = new Float32Array(buckets);
    const block = data.length / buckets;
    for (let i = 0; i < buckets; i++) {
      const start = Math.floor(i * block);
      const end = Math.min(data.length, Math.floor((i + 1) * block));
      let max = 0;
      const step = Math.max(1, Math.floor((end - start) / 400));
      for (let j = start; j < end; j += step) {
        const v = data[j] < 0 ? -data[j] : data[j];
        if (v > max) max = v;
      }
      peaks[i] = max;
    }
    self.postMessage({ peaks }, [peaks.buffer]);
  } catch (err) {
    self.postMessage({ peaks: null, error: String(err) });
  }
};
