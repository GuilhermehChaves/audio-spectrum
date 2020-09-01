class Spectrum {
    constructor(config) {
        this.FFTSize = config.FFTSize;
        this.isPlaying = false;
        this.autoplay = false;
        this.canvas = document.getElementById(config.canvasID) || {};
        this.canvasCTX = canvas.getContext('2d') || null;
        this.audio = document.getElementById(config.audioID) || {}
        this.audioContext = null;
        this.analyser = null;
        this.frequency = null;
        this.src = null;
        this.bufferSrc = null;
        this.duration = 0;
        this.barWidth = 3;
        this.barHeight = 15;
        this.barSpacing = 3;
        this.barColor = config.barColor || "rgb(9, 132, 227)";
        this.gradient = null;
        this.radius = config.radius || 140;
        this.fullCircle = config.fullCircle || false;

        this.WIDTH = window.innerWidth;
        this.HEIGHT = window.innerHeight;

        this.init();
    }

    init() {
        this.setAudioContext();
        this.setAnalyser();
        this.setFrequency();
        this.setBufferSrc();
        this.setSrc();
        this.setDefaultCanvas();
        this.start();
    }

    start() {
        const _this = this;

        document.addEventListener('click', function (e) {
            if (e.target === _this.canvas) {
                e.stopPropagation();
                if (_this.isPlaying) {
                    return _this.pause();
                } else {
                    return _this.audioContext.state === 'suspended' ? _this.play() : _this.load();
                }
            }
        });
    }

    load() {
        const request = new XMLHttpRequest();
        request.open('GET', this.src, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            this.audioContext.decodeAudioData(request.response, this.play.bind(this), function () {
                console.log("An error ocurred while loading audio...");
            }.bind(this));
        }.bind(this);

        request.send();
    }

    play(buffer) {
        this.isPlaying = true;
        if (this.audioContext.state === 'suspended') return this.resume();

        this.bufferSrc.buffer = buffer;
        this.bufferSrc.start(0);
        this.render();
    }

    setAudioContext() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    setAnalyser() {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.6;
        this.analyser.fftSize = this.FFTSize;
    }

    setFrequency() {
        this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
    }

    setBufferSrc() {
        this.bufferSrc = this.audioContext.createBufferSource();
        this.bufferSrc.loop = false;
        this.bufferSrc.connect(this.analyser);
        this.bufferSrc.connect(this.audioContext.destination);

        this.bufferSrc.onended = function () {
            this.bufferSrc.disconnect();
            this.isPlaying = false;
            this.bufferSrc = this.audioContext.createBufferSource()
        }.bind(this);
    }

    setSrc() {
        this.src = this.audio.getAttribute('src');
    }

    setDefaultCanvas() {
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;

        this.gradient = this.canvasCTX.createLinearGradient(0, 0, 300, 0);
        this.gradient.addColorStop(0, this.barColor);
        this.gradient.addColorStop(1, "white");
        this.canvas.fillStyle = this.gradient;
        this.canvas.textAlign = 'center';
    }

    pause() {
        this.audioContext.suspend();
        this.isPlaying = false;
    }

    resume() {
        this.audioContext.resume();
    }

    renderText() {
        var cx = this.canvas.width / 2;
        var cy = this.canvas.height / 2;
        var correction = 10;

        this.canvasCTX.textBaseLine = 'center';
        this.canvasCTX.font = "20px Helvetica";
        this.canvasCTX.fillText(this.audioContext.state === "running" ? "Playing..." : "Paused...", cx - correction * 2, cy);
    }

    render() {
        requestAnimationFrame(this.render.bind(this));
        this.analyser.getByteFrequencyData(this.frequency);
        this.canvasCTX.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderText();

        var cx = this.canvas.width / 2;
        var cy = this.canvas.height / 2;
        var radius = this.radius;
        var maxBarNum = Math.floor((radius * 2 * Math.PI) / (this.barWidth + this.barSpacing));
        var slicedPercent = Math.floor((maxBarNum * 25) / 100);

        var barNum = (this.fullCircle) ? maxBarNum : maxBarNum - slicedPercent;
        
        var freqJump = Math.floor(this.frequency.length / maxBarNum);

        for (var i = 0; i < barNum; i++) {
            var amplitude = this.frequency[i * freqJump];
            var alfa = (i * 2 * Math.PI) / maxBarNum;
            var beta = (3 * 45 - this.barWidth) * Math.PI / 180;
            var x = 0;
            var y = radius - (amplitude / 12 - this.barHeight);
            var w = this.barWidth;
            var h = amplitude / 6 + this.barHeight;

            this.canvasCTX.fillStyle = this.barColor;
            this.canvasCTX.save();
            this.canvasCTX.translate(cx + this.barSpacing, cy + this.barSpacing);
            this.canvasCTX.rotate(alfa - beta);
            this.canvasCTX.fillRect(x, y, w, h);
            this.canvasCTX.restore();
        }
    }
}
