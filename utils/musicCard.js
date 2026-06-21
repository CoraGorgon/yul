const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

const THEME = {
    // Degradado con más profundidad (Negro carbón a gris oscuro)
    bgStart: "#1a1a1a",
    bgEnd: "#050505",
    accent: "#1DB954",
    textMain: "#FFFFFF",
    textSecondary: "#B3B3B3",
    rail: "#3F3F3F",
};

async function fetchImageBuffer(url, timeout = 2500) {
    try {
        const resp = await axios.get(url, {
            responseType: "arraybuffer",
            timeout,
            headers: { "User-Agent": "Mozilla/5.0" },
        });
        return Buffer.from(resp.data);
    } catch (_) { return null; }
}

function tryExtractYouTubeId(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
        if (u.hostname === "youtu.be") return u.pathname.slice(1);
    } catch (_) { if (/^[\w-]{11}$/.test(url)) return url; }
    return null;
}

async function getYouTubeThumbnail(videoId) {
    if (!videoId) return null;
    const candidates = [`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`];
    for (const url of candidates) {
        const buffer = await fetchImageBuffer(url);
        if (buffer && buffer.length > 5000) return buffer;
    }
    return null;
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

class EnhancedMusicCard {
    async generateCard(options) {
        const config = {
            width: 600, height: 200,
            thumbnailURL: options.thumbnailURL || "",
            trackURI: options.trackURI || options.thumbnailURL || "",
            songTitle: options.songTitle || "Unknown",
            songArtist: options.songArtist || "Unknown",
            currentPositionMs: options.currentPositionMs || 0,
            totalDurationMs: options.totalDurationMs || 0,
        };

        const canvas = createCanvas(config.width, config.height);
        const ctx = canvas.getContext("2d");

        const card = this.drawMainCard(ctx, config);
        const thumb = await this.drawThumbnail(ctx, config, card);
        
        await this.drawTrackMeta(ctx, config, card, thumb);

        return canvas.toBuffer("image/png");
    }

    drawMainCard(ctx, config) {
        const cardX = 20, cardY = 20, cardW = config.width - 40, cardH = config.height - 40;
        
        // Degradado profesional con más contraste
        const grad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
        grad.addColorStop(0, THEME.bgStart);
        grad.addColorStop(1, THEME.bgEnd);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 16);
        ctx.fill();
        return { x: cardX, y: cardY, w: cardW, h: cardH };
    }

    async drawThumbnail(ctx, config, card) {
        const size = card.h - 40;
        const x = card.x + 20, y = card.y + 20;
        const ytId = tryExtractYouTubeId(config.trackURI) || tryExtractYouTubeId(config.thumbnailURL);
        const buffer = ytId ? await getYouTubeThumbnail(ytId) : null;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 8); // Bordes redondeados sutiles
        ctx.clip();
        
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(x, y, size, size);

        if (buffer) {
            const img = await loadImage(buffer);
            // Lógica "Cover" para no estirar la imagen
            const scale = Math.max(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const xPos = x + (size - w) / 2;
            const yPos = y + (size - h) / 2;
            ctx.drawImage(img, xPos, yPos, w, h);
        }
        ctx.restore();
        return { x, y, size };
    }

    async drawTrackMeta(ctx, config, card, thumb) {
        const textX = thumb.x + thumb.size + 30;
        const maxTextW = (card.x + card.w) - textX - 30;

        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = THEME.textMain;
        ctx.font = "700 32px system-ui, sans-serif";
        ctx.fillText(this.truncateText(ctx, config.songTitle, maxTextW), textX, card.y + 75);

        ctx.fillStyle = THEME.textSecondary;
        ctx.font = "500 24px system-ui, sans-serif";
        ctx.fillText(this.truncateText(ctx, config.songArtist, maxTextW), textX, card.y + 115);
        
        ctx.shadowBlur = 0;

        // Marca de agua más pequeña y bien posicionada
        const wmBuffer = await fetchImageBuffer("https://i.imgur.com/oi2SwIH.png");
        if (wmBuffer) {
            try {
                const wmImg = await loadImage(wmBuffer);
                const wmWidth = 110; // Tamaño reducido
                const wmHeight = 42;
                const wmX = (card.x + card.w) - wmWidth - 25; 
                const wmY = card.y + 130; 
                ctx.globalAlpha = 0.8; // Ligera transparencia para elegancia
                ctx.drawImage(wmImg, wmX, wmY, wmWidth, wmHeight);
                ctx.globalAlpha = 1.0;
            } catch (e) {}
        }

        const progress = clamp(config.currentPositionMs / config.totalDurationMs, 0, 1);
        ctx.fillStyle = THEME.rail;
        ctx.beginPath();
        ctx.roundRect(textX, card.y + 220, maxTextW, 4, 2);
        ctx.fill();
        ctx.fillStyle = THEME.accent;
        ctx.beginPath();
        ctx.roundRect(textX, card.y + 220, maxTextW * progress, 4, 2);
        ctx.fill();

        ctx.fillStyle = THEME.textSecondary;
        ctx.font = "400 14px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(formatDuration(config.currentPositionMs), textX, card.y + 250);
        ctx.textAlign = "right";
        ctx.fillText(formatDuration(config.totalDurationMs), textX + maxTextW, card.y + 250);
        ctx.textAlign = "left"; 
    }

    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let out = text;
        while (out.length > 0 && ctx.measureText(`${out}...`).width > maxWidth) out = out.slice(0, -1);
        return `${out}...`;
    }
}

module.exports = { EnhancedMusicCard };