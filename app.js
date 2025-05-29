let stream = null;
let capturedSlices = [];
let isCapturing = false;
let captureInterval = null;
let frameCount = 0;
let lastCaptureTime = 0;
let sliceWidth = 1; // Width of each slice in pixels (single vertical line)
const CAPTURE_FPS = 100; // Fixed capture framerate
let playbackFPS = 30; // Default playback framerate

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
        
        // Add each camera with a descriptive label
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            
            // Create a more descriptive label
            let label = device.label || `Camera ${index + 1}`;
            if (label.includes('facing back')) {
                label = 'Back Camera';
            } else if (label.includes('facing front')) {
                label = 'Front Camera';
            }
            
            option.textContent = label;
            cameraSelect.appendChild(option);
        });
        
        // If no cameras found, show a message
        if (videoDevices.length === 0) {
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
    const imageData = ctx.getImageData(centerX, 0, sliceWidth, canvas.height);
    
    // Add the slice to our collection
    capturedSlices.push(imageData);
    
    // Update both previews
    updateSlicePreview();
    updateFullPreview();
    
    // Debug logging
    frameCount++;
    const now = performance.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    lastCaptureTime = now;
    console.log(`Frame ${frameCount}: Time since last capture: ${timeSinceLastCapture.toFixed(2)}ms`);
}

// Update the full preview with all captured slices
function updateFullPreview() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate total width based on number of slices and frame step
    const frameStep = Math.max(1, Math.floor(CAPTURE_FPS / playbackFPS));
    const totalWidth = Math.ceil(capturedSlices.length / frameStep);
    
    // Set canvas dimensions while maintaining aspect ratio
    const aspectRatio = preview.videoHeight / preview.videoWidth;
    const maxHeight = 200; // Match CSS max-height
    const maxWidth = 600; // Match CSS max-width
    
    // Calculate dimensions that maintain aspect ratio and fit within max dimensions
    let width = totalWidth;
    let height = width * aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height / aspectRatio;
    }
    if (width > maxWidth) {
        width = maxWidth;
        height = width * aspectRatio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw each slice
    for (let i = 0; i < capturedSlices.length; i += frameStep) {
        const slice = capturedSlices[i];
        const x = Math.floor((i / frameStep) * (width / totalWidth));
        ctx.putImageData(slice, x, 0, 1, height);
    }
    
    // Update the preview
    const previewCtx = slicePreview.getContext('2d');
    slicePreview.width = width;
    slicePreview.height = height;
    previewCtx.clearRect(0, 0, width, height);
    previewCtx.drawImage(canvas, 0, 0, width, height);
}

// Update the slice preview
function updateSlicePreview() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = capturedSlices.length;
    canvas.height = preview.videoHeight;
    
    // Draw all slices
    for (let i = 0; i < capturedSlices.length; i++) {
        ctx.putImageData(capturedSlices[i], i, 0);
    }
    
    // Update the preview
    const previewCtx = slicePreview.getContext('2d');
    slicePreview.width = canvas.width;
    slicePreview.height = canvas.height;
    previewCtx.clearRect(0, 0, slicePreview.width, slicePreview.height);
    previewCtx.drawImage(canvas, 0, 0, slicePreview.width, slicePreview.height);
}

// Download the final image
function downloadImage() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate total width based on number of slices and frame step
    const frameStep = Math.max(1, Math.floor(CAPTURE_FPS / playbackFPS));
    const totalWidth = Math.ceil(capturedSlices.length / frameStep);
    
    // Use original video dimensions for the downloaded image
    canvas.width = totalWidth;
    canvas.height = preview.videoHeight;
    
    // Draw each slice at full resolution
    for (let i = 0; i < capturedSlices.length; i += frameStep) {
        const slice = capturedSlices[i];
        const x = Math.floor(i / frameStep);
        ctx.putImageData(slice, x, 0);
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'slit-scan-' + new Date().toISOString() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
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

// Update playback FPS
function updatePlaybackFPS() {
    const newFPS = parseInt(playbackFPSSelect.value);
    if (newFPS >= 1 && newFPS <= 100) {
        playbackFPS = newFPS;
        // Update both previews when FPS changes
        updateSlicePreview();
        updateFullPreview();
    }
}

// Recompose preview with current playback FPS
function recomposePreview() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate total width based on playback FPS
    // Scale down the number of frames based on the selected FPS
    const framesToShow = Math.ceil(capturedSlices.length * (playbackFPS / CAPTURE_FPS));
    const totalWidth = framesToShow * sliceWidth;
    canvas.width = totalWidth;
    canvas.height = capturedSlices[0].naturalHeight;
    
    // Draw slices with adjusted spacing
    let x = 0;
    const frameStep = Math.floor(CAPTURE_FPS / playbackFPS);
    
    for (let i = 0; i < capturedSlices.length; i += frameStep) {
        ctx.drawImage(capturedSlices[i], x, 0);
        x += sliceWidth;
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