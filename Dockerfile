# Render deployment with Tesseract OCR support
FROM node:20-slim

# Install Tesseract OCR + Chinese language pack
RUN apt-get update && \
    apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    && rm -rf /var/lib/apt/lists/*

# Verify installation
RUN tesseract --version && tesseract --list-langs | grep chi_sim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
