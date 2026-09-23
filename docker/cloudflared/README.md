# Cloudflare Tunnel container

The Compose stack uses the official `cloudflare/cloudflared:latest` image directly. It runs a remotely managed tunnel with `cloudflared tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}` and routes the configured public hostname to `http://api:3000` over the Docker network. No Cloudflare credentials are committed or mounted into the repository.
