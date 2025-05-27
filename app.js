let stream = null;
let capturedSlices = [];
let isCapturing = false;
let captureInterval = null;
let frameCount = 0;
let lastCaptureTime = 0;
let targetHeight = 300; // Match the CSS height

const preview = document.getElementById('preview');
const slicePreview = document.getElementById('slicePreview');
const cameraSelect = document.getElementById('cameraSelect');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('captureButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');

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

        startButton.textContent = 'Stop Camera';
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
    startButton.textContent = 'Start Camera';
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
    
    // Reset preview
    slicePreview.innerHTML = '';
    capturedSlices = [];
    
    // Start capturing at 100ms intervals
    captureInterval = setInterval(captureSlice, 100);
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

// Capture a slice
function captureSlice() {
    if (!stream || !isCapturing) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video aspect ratio
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    
    // Draw the current frame
    ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
    
    // Create an image from the canvas
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.height = '100%';
    
    // Add to preview
    slicePreview.appendChild(img);
    capturedSlices.push(img);
    
    // Scroll to the end
    slicePreview.scrollLeft = slicePreview.scrollWidth;
    
    // Debug logging
    frameCount++;
    const now = performance.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    lastCaptureTime = now;
    console.log(`Frame ${frameCount}: Time since last capture: ${timeSinceLastCapture.toFixed(2)}ms`);
}

// Download the final image
function downloadImage() {
    if (capturedSlices.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match the total width of all slices
    canvas.width = capturedSlices.reduce((total, img) => total + img.naturalWidth, 0);
    canvas.height = capturedSlices[0].naturalHeight;
    
    // Draw all slices
    let x = 0;
    capturedSlices.forEach(img => {
        ctx.drawImage(img, x, 0);
        x += img.naturalWidth;
    });
    
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
startButton.addEventListener('click', () => {
    if (stream) {
        stopCamera();
    } else {
        startCamera();
    }
});

captureButton.addEventListener('click', () => {
    if (isCapturing) {
        stopCapturing();
    } else {
        startCapturing();
    }
});

downloadButton.addEventListener('click', downloadImage);
clearButton.addEventListener('click', clearSlices);

// Initialize
getCameras(); 