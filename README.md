# This project does not use transformer.js and uses its own tokenizer. It uses [easpeak-ng](https://www.jsdelivr.com/package/npm/espeak-ng) and [onnxruntime-web](https://www.jsdelivr.com/package/npm/onnxruntime-web) packages delivered through cdns. It does not need node/npm to run.

# a mainline npm package is available through https://github.com/hexgrad/kokoro 

# to use this project open a basic http server with index.html in the root directory.

# demo on https://shubinwang.com/tts

## to test the caching features https is required. model splitting feature is now optional since quantized model is so small.

### The orignal model by (kokoro-82m)[https://huggingface.co/hexgrad/Kokoro-82M/tree/main] by [Hexgrad](https://github.com/hexgrad). The model in this project is quantized version by Xenova [Joshua Lochner](https://github.com/xenova). 

#### To use the original model(kokoro-v0_19.onnx) change ```modelVersion = 0``` in ```index.js``` and make sure to refrence the right model location/name!
the model uses apache 2.0 lisence

