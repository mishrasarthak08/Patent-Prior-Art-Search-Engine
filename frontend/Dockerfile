FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the files
COPY . .

# Build the Next.js app
RUN npm run build

# Start the application
CMD ["npm", "start"]

EXPOSE 3000
