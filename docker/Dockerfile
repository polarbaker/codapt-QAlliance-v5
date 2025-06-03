FROM debian:12

WORKDIR /app

# Install system dependencies including Sharp requirements and memory monitoring tools
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install --yes \
    curl wget \
    # Node.js setup
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash && \
    DEBIAN_FRONTEND=noninteractive apt-get install --yes nodejs && \
    # Build tools and libraries for Sharp and native modules
    DEBIAN_FRONTEND=noninteractive apt-get install --yes \
    build-essential \
    python3 \
    python3-pip \
    pkg-config \
    # Image processing libraries for Sharp
    libvips-dev \
    libvips-tools \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libgif-dev \
    libtiff5-dev \
    libexif-dev \
    libxml2-dev \
    libpoppler-glib-dev \
    librsvg2-dev \
    libcairo2-dev \
    libpango1.0-dev \
    # System utilities and monitoring tools
    htop \
    iotop \
    sysstat \
    procps \
    psmisc \
    lsof \
    netcat-openbsd \
    dnsutils \
    iputils-ping \
    # Additional utilities
    vim \
    less \
    sudo \
    libsecret-1-0 \
    command-not-found \
    rsync \
    man-db \
    tini \
    # Memory management utilities
    valgrind \
    && DEBIAN_FRONTEND=noninteractive apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm and configure store directory
RUN npm install -g pnpm
RUN pnpm set store-dir /app/node_modules/.pnpm-store

# Set optimal Node.js environment variables for memory management
ENV NODE_OPTIONS="--max-old-space-size=3072 --expose-gc"
ENV UV_THREADPOOL_SIZE=4
ENV MALLOC_ARENA_MAX=2

# Configure Sharp for production
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV SHARP_CONCURRENCY=1
ENV SHARP_CACHE_SIZE=0
