class SlitScanCamera {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('slit-scan-preview');
        this.ctx = this.canvas.getContext('2d');
        this.sliceIndicator = document.getElementById('slice-indicator');
        this.previewContainer = document.querySelector('.preview-container');
        
        // Control Elements
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.slicePosition = document.getElementById('slice-position');
        this.sliceWidth = document.getElementById('slice-width');
        this.captureRate = document.getElementById('capture-rate');
        
        // State
        this.isCapturing = false;
        this.captureInterval = null;
        this.stream = null;
        this.frameCount = 0;
        this.lastCaptureTime = 0;
        this.targetHeight = 300; // Match the CSS height
        
        // Bind methods
        this.startCapture = this.startCapture.bind(this);
        this.stopCapture = this.stopCapture.bind(this);
        this.downloadImage = this.downloadImage.bind(this);
        this.updateSliceIndicator = this.updateSliceIndicator.bind(this);
        
        // Initialize
        this.initializeCamera();
        this.setupEventListeners();
    }
    
    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    // Calculate the aspect ratio
                    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
                    const targetWidth = Math.round(this.targetHeight * aspectRatio);
                    
                    // Set initial canvas size
                    this.canvas.width = 0;
                    this.canvas.height = this.targetHeight;
                    resolve();
                };
                this.video.onerror = (error) => {
                    reject(new Error('Video element error: ' + error.message));
                };
            });
            
            // Enable start button
            this.startBtn.disabled = false;
            console.log('Camera initialized successfully');
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', this.startCapture);
        this.stopBtn.addEventListener('click', this.stopCapture);
        this.downloadBtn.addEventListener('click', this.downloadImage);
        this.slicePosition.addEventListener('change', this.updateSliceIndicator);
        
        // Update slice indicator on video resize
        this.video.addEventListener('resize', this.updateSliceIndicator);
    }
    
    updateSliceIndicator() {
        const position = this.slicePosition.value;
        let left;
        
        switch (position) {
            case 'left':
                left = '33%';
                break;
            case 'right':
                left = '66%';
                break;
            default: // center
                left = '50%';
        }
        
        this.sliceIndicator.style.left = left;
    }
    
    startCapture() {
        if (!this.stream) return;
        
        this.isCapturing = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.downloadBtn.disabled = true;
        this.frameCount = 0;
        
        // Reset canvas
        this.canvas.width = 0;
        this.canvas.height = this.targetHeight;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log('Starting capture with video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
        
        const rate = parseInt(this.captureRate.value);
        this.captureInterval = setInterval(() => this.captureSlice(), rate);
    }
    
    stopCapture() {
        this.isCapturing = false;
        clearInterval(this.captureInterval);
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.downloadBtn.disabled = false;
    }
    
    captureSlice() {
        if (!this.isCapturing) return;
        
        const width = parseInt(this.sliceWidth.value);
        const position = this.slicePosition.value;
        let x;
        
        // Calculate slice position
        switch (position) {
            case 'left':
                x = Math.floor(this.video.videoWidth * 0.33);
                break;
            case 'right':
                x = Math.floor(this.video.videoWidth * 0.66);
                break;
            default: // center
                x = Math.floor(this.video.videoWidth * 0.5);
        }
        
        // Adjust x to account for slice width
        x = Math.floor(x - (width / 2));
        
        // Debug logging
        this.frameCount++;
        const now = performance.now();
        const timeSinceLastCapture = now - this.lastCaptureTime;
        this.lastCaptureTime = now;
        
        // Create temporary canvas for the slice
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = this.targetHeight;
        
        // Draw the slice from the video, scaled to target height
        tempCtx.drawImage(
            this.video,
            x, 0, width, this.video.videoHeight,
            0, 0, width, this.targetHeight
        );
        
        // Resize the main canvas to accommodate the new slice
        const newWidth = this.canvas.width + width;
        const tempCanvas2 = document.createElement('canvas');
        const tempCtx2 = tempCanvas2.getContext('2d');
        tempCanvas2.width = newWidth;
        tempCanvas2.height = this.targetHeight;
        
        // Copy existing content
        if (this.canvas.width > 0) {
            tempCtx2.drawImage(this.canvas, 0, 0);
        }
        
        // Add new slice
        tempCtx2.drawImage(tempCanvas, this.canvas.width, 0);
        
        // Update main canvas
        this.canvas.width = newWidth;
        this.ctx.drawImage(tempCanvas2, 0, 0);
        
        // Add a visual indicator of progress
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(this.canvas.width - width, 0, width, 10);
        
        // Auto-scroll to the right
        this.previewContainer.scrollLeft = this.previewContainer.scrollWidth;
        
        console.log(`Frame ${this.frameCount}: Canvas size ${this.canvas.width}x${this.canvas.height}`);
    }
    
    downloadImage() {
        const link = document.createElement('a');
        link.download = `slit-scan-${new Date().toISOString()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SlitScanCamera();
}); 