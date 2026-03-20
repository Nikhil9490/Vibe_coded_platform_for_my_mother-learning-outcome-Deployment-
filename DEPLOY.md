# AWS Deployment Guide

## Option A: AWS Lightsail (Recommended — Cheapest & Easiest)
**Cost: ~$3.50/month** (512MB RAM, 20GB SSD)

### 1. Create a Lightsail Instance
1. Go to [AWS Lightsail](https://lightsail.aws.amazon.com)
2. Create instance → Linux/Unix → OS Only → **Ubuntu 22.04 LTS**
3. Choose **$3.50/month** plan
4. Name it `rohini-stories` → Create

### 2. Open Port 3000 (or 80)
- In Lightsail console → Networking tab → Add rule: **HTTP (port 80)**

### 3. SSH into the instance
```bash
# Download the SSH key from Lightsail console first
ssh -i ~/LightsailDefaultKey.pem ubuntu@YOUR_INSTANCE_IP
```

### 4. Install Node.js and dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (keeps app running)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

### 5. Upload the project
On your **local machine**:
```bash
# From the rohini_website folder
scp -i ~/LightsailDefaultKey.pem -r . ubuntu@YOUR_IP:~/rohini_website/
```

### 6. Set up the app on the server
```bash
cd ~/rohini_website

# Create .env file
cp .env.example .env
nano .env
# Set a strong JWT_SECRET, your desired ADMIN_USERNAME and ADMIN_PASSWORD

# Install dependencies
npm install

# Create admin account
npm run setup

# Start with PM2
pm2 start server.js --name rohini-stories
pm2 save
pm2 startup   # follow the command it prints
```

### 7. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/rohini
```
Paste:
```nginx
server {
    listen 80;
    server_name YOUR_INSTANCE_IP;  # or your domain name

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/rohini /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. (Optional) Add a free domain with HTTPS
- Buy a domain from Route 53 or any registrar
- Point it to your Lightsail static IP
- Run: `sudo apt install -y certbot python3-certbot-nginx`
- Run: `sudo certbot --nginx -d yourdomain.com`

---

## Option B: AWS EC2 (More control)
**Cost: Free for 1 year (t2.micro/t3.micro), then ~$8/month**

Same steps as above, but create an EC2 instance (t3.micro, Ubuntu 22.04) instead of Lightsail.
- Remember to configure the Security Group to allow port 80 and 443.
- Assign an Elastic IP so your IP doesn't change.

---

## Updating the website later

When you make changes locally:
```bash
# On your local machine — upload changed files
scp -i ~/LightsailDefaultKey.pem -r . ubuntu@YOUR_IP:~/rohini_website/

# On the server — restart the app
pm2 restart rohini-stories
```

---

## Backup the database

The SQLite database is stored at `data/stories.db`. Back it up regularly:
```bash
# On server — copy to a safe location
cp ~/rohini_website/data/stories.db ~/backup-$(date +%Y%m%d).db
```

Or download to your local machine:
```bash
scp -i ~/LightsailDefaultKey.pem ubuntu@YOUR_IP:~/rohini_website/data/stories.db ./backup.db
```
