// Select the file input and canvas elements
const x_coordinate = document.getElementById('x-coordinate');
const y_coordinate = document.getElementById('y-coordinate');
const colorText = document.getElementById('colorText');
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });  //context



document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const fileType = file.name.split('.').pop().toLowerCase();

        if (fileType === 'pgm') {
            processPGMFile(file, canvas, ctx, () => console.log('PGM file processed'));
        } else if (fileType === 'pbm') {
            processPBMFile(file, canvas, ctx, () => console.log('PBM file processed'));
        } else if (fileType === 'ppm') {
            processPPMFile(file, canvas, ctx, () => console.log('PPM file processed'));
        } else {
            console.error('Unsupported file type');
        }
    }
});


// Listen for the 'click' event on the canvas
canvas.addEventListener('click', function (event) {

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;  // X coordinate relative to the canvas
    const y = event.clientY - rect.top;   // Y coordinate relative to the canvas
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    console.log(r);console.log(g);console.log(b);console.log("_____");
    // Convert to HEX
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    x_coordinate.innerHTML = x;
    y_coordinate.innerHTML = y;
    colorText.innerHTML = `${hex} (RGB: ${r},${g},${b})`

});

function processPGMFile(file, canvas, ctx, callback) {
    const reader = new FileReader();

    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        const dataView = new DataView(arrayBuffer);

        let header = "", i = 0, isHeaderComplete = false;
        while (i < arrayBuffer.byteLength && !isHeaderComplete) {
            const char = String.fromCharCode(dataView.getUint8(i++));
            if (char === '#') {
                while (i < arrayBuffer.byteLength && dataView.getUint8(i) !== 10) { i++; }
            } else {
                header += char;
                if (header.indexOf("\n255\n") !== -1) { isHeaderComplete = true; }
            }
        }

        const headerParts = header.trim().split(/\s+/);
        if (headerParts[0] !== "P5") {
            console.error("Unsupported PGM format. Only P5 (binary) is supported.");
            return;
        }

        const width = parseInt(headerParts[1], 10);
        const height = parseInt(headerParts[2], 10);
        const maxVal = parseInt(headerParts[3], 10);

        if (maxVal !== 255) {
            console.warn("Max value is not 255. Pixel values may need normalization.");
        }

        let offset = i;
        const imageData = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {  // No vertical flipping
            for (let x = 0; x < width; x++) {
                const gray = dataView.getUint8(offset++);
                const index = (y * width + x) * 4;
                imageData[index] = gray;
                imageData[index + 1] = gray;
                imageData[index + 2] = gray;
                imageData[index + 3] = 255;
            }
        }

        const imageDataObj = new ImageData(imageData, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageDataObj, 0, 0);
        callback();
    };

    reader.readAsArrayBuffer(file);
}


function processPBMFile(file, canvas, ctx, callback) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        const dataView = new DataView(arrayBuffer);
        let header = "", i = 0, isHeaderComplete = false;
        
        // Parse header
        while (i < arrayBuffer.byteLength && !isHeaderComplete) {
            const char = String.fromCharCode(dataView.getUint8(i++));
            if (char === '#') {
                // Skip comments
                while (i < arrayBuffer.byteLength && dataView.getUint8(i) !== 10) { // Newline
                    i++;
                }
            } else {
                header += char;
                // PBM files don't have max value like PGM, so we just look for dimensions
                if (header.match(/^P[14]\s+\d+\s+\d+\s/)) {
                    isHeaderComplete = true;
                }
            }
        }
        
        // Parse dimensions
        const headerParts = header.trim().split(/\s+/);
        const format = headerParts[0]; // P1 for ASCII, P4 for binary
        const width = parseInt(headerParts[1], 10);
        const height = parseInt(headerParts[2], 10);
        const imageData = new Uint8ClampedArray(width * height * 4);
        
        if (format === 'P1') {
            // ASCII format
            let data = "";
            while (i < arrayBuffer.byteLength) {
                const char = String.fromCharCode(dataView.getUint8(i++));
                if (char === '#') {
                    while (i < arrayBuffer.byteLength && dataView.getUint8(i) !== 10) {
                        i++;
                    }
                } else if (char === '0' || char === '1') {
                    data += char;
                }
            }
            
            let dataIndex = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const value = data[dataIndex++] === '1' ? 0 : 255; // 1 is black, 0 is white
                    const index = (y * width + x) * 4;
                    imageData[index] = value;     // Red
                    imageData[index + 1] = value; // Green
                    imageData[index + 2] = value; // Blue
                    imageData[index + 3] = 255;   // Alpha
                }
            }
        } else if (format === 'P4') {
            // Binary format
            for (let y = 0; y < height; y++) {
                let bitOffset = 0;
                let currentByte;
                
                for (let x = 0; x < width; x++) {
                    if (bitOffset === 0) {
                        currentByte = dataView.getUint8(i++);
                        bitOffset = 8;
                    }
                    
                    // Extract the next bit
                    const bit = (currentByte >> (7 - (bitOffset - 1))) & 1;
                    const value = bit === 1 ? 0 : 255; // 1 is black, 0 is white
                    
                    const index = (y * width + x) * 4;
                    imageData[index] = value;     // Red
                    imageData[index + 1] = value; // Green
                    imageData[index + 2] = value; // Blue
                    imageData[index + 3] = 255;   // Alpha
                    
                    bitOffset--;
                }
                
                // Align to the next byte boundary if width is not divisible by 8
                if (bitOffset !== 0 && x !== width - 1) {
                    i++;
                }
            }
        }
        
        const imageDataObj = new ImageData(imageData, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageDataObj, 0, 0);
        callback();
    };
    
    reader.readAsArrayBuffer(file);
}

function processPPMFile(file, canvas, ctx, callback) {
    const reader = new FileReader();

    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        const dataView = new DataView(arrayBuffer);

        let header = "", i = 0, isHeaderComplete = false;
        while (i < arrayBuffer.byteLength && !isHeaderComplete) {
            const char = String.fromCharCode(dataView.getUint8(i++));

            if (char === '#') {
                // Skip comments
                while (i < arrayBuffer.byteLength && dataView.getUint8(i) !== 10) { // Newline
                    i++;
                }
            } else {
                header += char;
                if (header.indexOf("\n255\n") !== -1) {
                    isHeaderComplete = true;
                }
            }
        }

        const headerParts = header.split(/\s+/);
        const width = parseInt(headerParts[1], 10);
        const height = parseInt(headerParts[2], 10);

        const imageData = new Uint8ClampedArray(width * height * 4);
        let offset = header.length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const r = dataView.getUint8(offset++);
                const g = dataView.getUint8(offset++);
                const b = dataView.getUint8(offset++);
                const index = (y * width + x) * 4;

                imageData[index] = r;       // Red
                imageData[index + 1] = g;   // Green
                imageData[index + 2] = b;   // Blue
                imageData[index + 3] = 255; // Alpha
            }
        }

        const imageDataObj = new ImageData(imageData, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageDataObj, 0, 0);
        callback();
    };

    reader.readAsArrayBuffer(file);
}
