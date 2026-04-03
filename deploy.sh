#!/bin/bash
# Deploy spark-api to VM
# Usage: bash deploy.sh

VM_HOST="rcorreia@192.168.59.70"
VM_PATH="~/Tinder2.0/spark-api"
LOCAL_PATH="/mnt/c/Users/Rodrigo/Desktop/Tinder/spark-api"

echo "🚀 Deploying spark-api to VM..."

# Sync source code (excluding node_modules, dist, .env)
echo "📦 Syncing files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.git' \
  "$LOCAL_PATH/" "$VM_HOST:$VM_PATH/"

# Build and restart on VM
echo "🔨 Building and restarting..."
ssh $VM_HOST "cd $VM_PATH && npm install --omit=dev 2>&1 | tail -1 && npm run build 2>&1 | tail -1 && npx prisma migrate deploy 2>&1 | tail -3 && pm2 restart spark-api 2>&1 | tail -1"

echo "✅ Deploy complete!"
echo "🔗 API: http://192.168.59.70/api/health"
