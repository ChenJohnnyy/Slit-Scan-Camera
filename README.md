# Slit-Scan Camera

A web-based application that creates slit-scan photography effects using your computer's camera. This application captures vertical slices of your camera feed and combines them to create unique time-based visual effects.

## Features

- Real-time camera preview
- Live slit-scan image construction
- Adjustable slice position (center, left third, right third)
- Customizable slice width
- Configurable capture rate
- Download final image as PNG
- Responsive design for various screen sizes

## How to Use

1. Open the application in a modern web browser
2. Grant camera permissions when prompted
3. Adjust the settings as desired:
   - Slice Position: Choose where to capture the vertical slice
   - Slice Width: Set the width of each captured slice (1-10 pixels)
   - Capture Rate: Set how frequently to capture slices (in milliseconds)
4. Click "Start" to begin capturing
5. Click "Stop" when you want to finish
6. Use "Download" to save your creation as a PNG file

## Technical Requirements

- Modern web browser with support for:
  - MediaDevices API
  - Canvas API
  - ES6+ JavaScript features
- Camera access permissions
- HTTPS connection (required for camera access in most browsers)

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Development

To run this application locally:

1. Clone the repository
2. Serve the files using a local web server
3. Open the application in your browser

For development, you can use any static file server. For example, with Python:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then visit `http://localhost:8000` in your browser.

## License

MIT License - feel free to use and modify for your own projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 