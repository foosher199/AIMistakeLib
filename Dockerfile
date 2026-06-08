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

# 接收 Render Dashboard 的环境变量作为构建参数
# Render 会自动将同名环境变量作为 --build-arg 传入
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ALIBABA_API_KEY
ARG BAIDU_API_KEY
ARG BAIDU_SECRET_KEY
ARG DEEPSEEK_API_KEY
ARG DEEPSEEK_API_URL
ARG DEEPSEEK_MODEL

# 转为环境变量，让 next build 能读到
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV ALIBABA_API_KEY=$ALIBABA_API_KEY
ENV BAIDU_API_KEY=$BAIDU_API_KEY
ENV BAIDU_SECRET_KEY=$BAIDU_SECRET_KEY
ENV DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
ENV DEEPSEEK_API_URL=$DEEPSEEK_API_URL
ENV DEEPSEEK_MODEL=$DEEPSEEK_MODEL

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
