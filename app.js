let stream = null;
let capturedSlices = [];
let isCapturing = false;
let captureInterval = null;
let frameCount = 0;
let lastCaptureTime = 0;
const SLICE_WIDTH = 20; // Width of each slice in pixels (twenty vertical lines)
const CAPTURE_FPS = 60; // Fixed capture framerate
let playbackFPS = 60; // Default playback framerate
let currentCaptureFPS = CAPTURE_FPS; // Current capture framerate
const MIN_CAPTURE_FPS = 10; // Minimum capture framerate
const DECELERATION_RATE = 0.95; // Rate at which FPS decreases (0.95 = 5% decrease per second)

const preview = document.getElementById('preview');
const slicePreview = document.getElementById('slicePreview');
const cameraSelect = document.getElementById('cameraSelect');
const captureButton = document.getElementById('captureButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const playbackFPSSelect = document.getElementById('playbackFPS');

// Get available cameras
async function getCameras() {
    try {
        // First request camera permission to get labels on mobile
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Clear existing options
        cameraSelect.innerHTML = '';
        
        // Check if we're on a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // For mobile, only show front and back camera options
            const frontCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('facing front') || 
                device.label.toLowerCase().includes('front')
            );
            const backCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('facing back') || 
                device.label.toLowerCase().includes('back')
            );
            
            if (backCamera) {
                const option = document.createElement('option');
                option.value = backCamera.deviceId;
                option.textContent = 'Back Camera';
                cameraSelect.appendChild(option);
            }
            
            if (frontCamera) {
                const option = document.createElement('option');
                option.value = frontCamera.deviceId;
                option.textContent = 'Front Camera';
                cameraSelect.appendChild(option);
            }
        } else {
            // For desktop, show all cameras with descriptive labels
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });
        }
        
        // If no cameras found, show a message
        if (cameraSelect.options.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
        }

        // Automatically start the camera after getting the list
        await startCamera();
    } catch (error) {
        console.error('Error getting cameras:', error);
        cameraSelect.innerHTML = '<option value="">No cameras found</option>';
    }
}

// Start camera with selected device
async function startCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: cameraSelect.value ? undefined : 'user' // Use front camera by default if no device selected
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        preview.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            preview.onloadedmetadata = () => {
                resolve();
            };
        });

        // Set preview container aspect ratio
        const aspectRatio = preview.videoWidth / preview.videoHeight;
        preview.style.aspectRatio = aspectRatio;

        captureButton.disabled = false;
        clearButton.disabled = false;
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Error starting camera. Please make sure you have granted camera permissions.');
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    preview.srcObject = null;
    captureButton.disabled = true;
    downloadButton.disabled = true;
    clearButton.disabled = true;
    stopCapturing();
}

// Start capturing slices
function startCapturing() {
    if (!stream) return;
    
    isCapturing = true;
    captureButton.textContent = 'Stop Capturing';
    captureButton.classList.add('recording');
    downloadButton.disabled = true;
    frameCount = 0;
    
    // Create a canvas for the final image
    const canvas = document.createElement('canvas');
    canvas.width = 0;
    canvas.height = preview.videoHeight; // Use full video height
    const ctx = canvas.getContext('2d');
    
    // Reset preview
    slicePreview.innerHTML = '';
    capturedSlices = [];
    
    // Calculate interval based on fixed capture FPS
    const interval = 1000 / CAPTURE_FPS;
    
    // Start capturing at specified FPS
    captureInterval = setInterval(() => captureSlice(canvas, ctx), interval);
}

// Stop capturing slices
function stopCapturing() {
    isCapturing = false;
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    captureButton.textContent = 'Start Capturing';
    captureButton.classList.remove('recording');
    downloadButton.disabled = false;
}

// Capture a single vertical slice from the center of the video
function captureSlice(canvas, ctx) {
    if (!stream || !isCapturing) return;

    // Set canvas dimensions to match video
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    
    // Draw the current video frame
    ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
    
    // Get the center vertical line of pixels
    const centerX = Math.floor(canvas.width / 2);
    const imageData = ctx.getImageData(centerX, 0, SLICE_WIDTH, canvas.height);
    
    // Add the slice to our collection
    capturedSlices.push(imageData);
    
    // Update preview
    updateSlicePreview();
    
    // Debug logging
    frameCount++;
    const now = performance.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    lastCaptureTime = now;
    console.log(`Frame ${frameCount}: Time since last capture: ${timeSinceLastCapture.toFixed(2)}ms`);
}

// Update the slice preview
function updateSlicePreview() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions to maintain 16:9 ratio
    const targetHeight = preview.videoHeight;
    const targetWidth = Math.round(targetHeight * (16/9));
    
    // Set canvas dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Create a temporary canvas for the entire preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw all slices from center outward
    const centerX = Math.floor(targetWidth / 2);
    const halfSlices = Math.floor(capturedSlices.length / 2);
    
    for (let i = 0; i < capturedSlices.length; i++) {
        // Create a slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = SLICE_WIDTH;
        sliceCanvas.height = targetHeight;
        const sliceCtx = sliceCanvas.getContext('2d');
        
        // Put the slice data into the slice canvas
        sliceCtx.putImageData(capturedSlices[i], 0, 0);
        
        // Calculate position from center
        const x = centerX - (halfSlices * SLICE_WIDTH) + (i * SLICE_WIDTH);
        tempCtx.drawImage(sliceCanvas, x, 0, SLICE_WIDTH, targetHeight);
    }
    
    // Update the preview
    const previewCtx = slicePreview.getContext('2d');
    slicePreview.width = targetWidth;
    slicePreview.height = targetHeight;
    previewCtx.clearRect(0, 0, slicePreview.width, slicePreview.height);
    previewCtx.drawImage(tempCanvas, 0, 0, slicePreview.width, slicePreview.height);
    
    // Scroll to the center of the preview
    slicePreview.scrollLeft = (slicePreview.scrollWidth - slicePreview.clientWidth) / 2;
}

// Download the final image
async function downloadImage() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate total width based on number of slices and slice width
    const totalWidth = capturedSlices.length * SLICE_WIDTH;
    
    // Use original video dimensions for the downloaded image
    canvas.width = totalWidth;
    canvas.height = preview.videoHeight;
    
    // Draw each slice at full resolution
    for (let i = 0; i < capturedSlices.length; i++) {
        const slice = capturedSlices[i];
        ctx.putImageData(slice, i * SLICE_WIDTH, 0);
    }
    
    // Get the data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        try {
            // Try to use the Web Share API first
            if (navigator.share) {
                // Convert data URL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], 'slit-scan-' + new Date().toISOString() + '.png', { type: 'image/png' });
                
                await navigator.share({
                    files: [file],
                    title: 'Slit Scan Image',
                    text: 'Check out this slit scan image I created!'
                });
            } else {
                // Fallback for devices without Web Share API
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = 'slit-scan-' + new Date().toISOString() + '.png';
                
                // For iOS devices
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    // Open in new tab
                    window.open(dataUrl, '_blank');
                } else {
                    // For Android devices
                    link.click();
                }
            }
        } catch (error) {
            console.error('Error saving image:', error);
            // Fallback to basic download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'slit-scan-' + new Date().toISOString() + '.png';
            link.click();
        }
    } else {
        // Desktop behavior - download directly
        const link = document.createElement('a');
        link.download = 'slit-scan-' + new Date().toISOString() + '.png';
        link.href = dataUrl;
        link.click();
    }
}

// Clear all captured slices
function clearSlices() {
    capturedSlices = [];
    slicePreview.innerHTML = '';
    downloadButton.disabled = true;
}

// Event listeners
captureButton.addEventListener('click', () => {
    if (isCapturing) {
        stopCapturing();
    } else {
        startCapturing();
    }
});

downloadButton.addEventListener('click', downloadImage);
clearButton.addEventListener('click', clearSlices);

// Add event listener for camera selection change
cameraSelect.addEventListener('change', startCamera);

// Update playback FPS
function updatePlaybackFPS() {
    const newFPS = parseInt(playbackFPSSelect.value);
    if (newFPS >= 1 && newFPS <= 100) {
        playbackFPS = newFPS;
        // Update preview when FPS changes
        updateSlicePreview();
    }
}

// Initialize playback FPS
function initializePlaybackFPS() {
    playbackFPSSelect.value = '60';
    playbackFPS = 60;
}

// Recompose preview with current playback FPS
function recomposePreview() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate total width based on playback FPS
    // Scale down the number of frames based on the selected FPS
    const framesToShow = Math.ceil(capturedSlices.length * (playbackFPS / CAPTURE_FPS));
    const totalWidth = framesToShow * SLICE_WIDTH;
    canvas.width = totalWidth;
    canvas.height = capturedSlices[0].naturalHeight;
    
    // Draw slices with adjusted spacing
    let x = 0;
    const frameStep = Math.floor(CAPTURE_FPS / playbackFPS);
    
    for (let i = 0; i < capturedSlices.length; i += frameStep) {
        ctx.drawImage(capturedSlices[i], x, 0);
        x += SLICE_WIDTH;
    }
    
    // Update preview
    const previewImg = document.createElement('img');
    previewImg.src = canvas.toDataURL('image/png');
    previewImg.style.height = '100%';
    
    // Clear and update preview
    slicePreview.innerHTML = '';
    slicePreview.appendChild(previewImg);
}

// Add event listeners for FPS controls
playbackFPSSelect.addEventListener('change', updatePlaybackFPS);

// Initialize
getCameras();
initializePlaybackFPS(); 