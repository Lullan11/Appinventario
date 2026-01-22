// src/js/camera.js
class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.photoData = null;
    }
    
    async initialize(videoId, canvasId) {
        this.videoElement = document.getElementById(videoId);
        this.canvasElement = document.getElementById(canvasId);
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            
            this.videoElement.srcObject = this.stream;
            return true;
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            return false;
        }
    }
    
    capturePhoto() {
        if (!this.videoElement || !this.canvasElement) return null;
        
        const context = this.canvasElement.getContext('2d');
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        this.photoData = this.canvasElement.toDataURL('image/jpeg', 0.8);
        return this.photoData;
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }
    
    getPhotoData() {
        return this.photoData;
    }
}

class SignaturePad {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.signatureData = null;
        
        this.setupCanvas();
        this.setupEvents();
    }
    
    setupCanvas() {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Limpiar canvas
        this.clear();
    }
    
    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Para dispositivos táctiles
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch, true);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.draw(touch, true);
        });
        
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }
    
    startDrawing(e, isTouch = false) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = isTouch ? e.clientX - rect.left : e.offsetX;
        this.lastY = isTouch ? e.clientY - rect.top : e.offsetY;
    }
    
    draw(e, isTouch = false) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentX = isTouch ? e.clientX - rect.left : e.offsetX;
        const currentY = isTouch ? e.clientY - rect.top : e.offsetY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
        
        this.lastX = currentX;
        this.lastY = currentY;
    }
    
    stopDrawing() {
        this.isDrawing = false;
        this.signatureData = this.canvas.toDataURL();
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.signatureData = null;
    }
    
    getSignatureData() {
        return this.signatureData;
    }
    
    isEmpty() {
        const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 0; i < pixelData.length; i += 4) {
            if (pixelData[i] !== 255 || pixelData[i + 1] !== 255 || pixelData[i + 2] !== 255) {
                return false;
            }
        }
        return true;
    }
}

// Exportar para uso global
window.CameraManager = CameraManager;
window.SignaturePad = SignaturePad;