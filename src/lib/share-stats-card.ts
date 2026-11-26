export type ShareCardStat = { label: string; value: string | number };

export type ShareStatsCard = {
  name: string;
  eyebrow: string;
  kind: "PLAYER PROFILE" | "TEAM PROFILE";
  imageUrl?: string | null;
  imageLabel?: string;
  stats: ShareCardStat[];
  accentLabel?: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const token = (name: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${value})`;
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const loadImage = (url?: string | null): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  let output = text;
  while (output.length > 1 && ctx.measureText(output).width > maxWidth) output = `${output.slice(0, -2)}…`;
  return output;
};

const drawImageCover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (image.naturalWidth - cropWidth) / 2;
  const cropY = (image.naturalHeight - cropHeight) / 2;
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
};

export const downloadStatsCard = async (card: ShareStatsCard) => {
  await document.fonts.ready;
  const [portrait] = await Promise.all([loadImage(card.imageUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is not available in this browser.");

  const background = token("--background");
  const primary = token("--primary");
  const accent = token("--accent");
  const foreground = token("--foreground");
  const muted = token("--muted-foreground");
  const cardColor = token("--card");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glow = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  glow.addColorStop(0, primary);
  glow.addColorStop(0.55, background);
  glow.addColorStop(1, accent);
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.globalAlpha = 1;

  roundedRect(ctx, 34, 34, CARD_WIDTH - 68, CARD_HEIGHT - 68, 42);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = "600 28px Poppins, sans-serif";
  ctx.fillStyle = primary;
  ctx.fillText("CRICKET STATS", 84, 112);
  ctx.textAlign = "right";
  ctx.fillStyle = muted;
  ctx.font = "500 24px Poppins, sans-serif";
  ctx.fillText(card.kind, CARD_WIDTH - 84, 112);
  ctx.textAlign = "left";

  const imageX = 84;
  const imageY = 174;
  const imageWidth = CARD_WIDTH - 168;
  const imageHeight = 670;
  roundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 32);
  ctx.save();
  ctx.clip();
  if (portrait) {
    drawImageCover(ctx, portrait, imageX, imageY, imageWidth, imageHeight);
  } else {
    const placeholder = ctx.createLinearGradient(imageX, imageY, imageX + imageWidth, imageY + imageHeight);
    placeholder.addColorStop(0, cardColor);
    placeholder.addColorStop(1, background);
    ctx.fillStyle = placeholder;
    ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
    ctx.fillStyle = primary;
    ctx.textAlign = "center";
    ctx.font = "700 160px Orbitron, sans-serif";
    ctx.fillText((card.imageLabel || card.name).trim().slice(0, 1).toUpperCase(), CARD_WIDTH / 2, imageY + 405);
    ctx.textAlign = "left";
  }
  const imageShade = ctx.createLinearGradient(0, imageY + 280, 0, imageY + imageHeight);
  imageShade.addColorStop(0, "transparent");
  imageShade.addColorStop(1, token("--background"));
  ctx.fillStyle = imageShade;
  ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
  ctx.restore();
  ctx.strokeStyle = primary;
  ctx.lineWidth = 3;
  roundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 32);
  ctx.stroke();

  ctx.fillStyle = foreground;
  ctx.font = "700 58px Orbitron, Poppins, sans-serif";
  ctx.fillText(fitText(ctx, card.name, imageWidth - 70), imageX + 36, imageY + imageHeight - 88);
  ctx.fillStyle = primary;
  ctx.font = "600 28px Poppins, sans-serif";
  ctx.fillText(fitText(ctx, card.eyebrow, imageWidth - 70), imageX + 38, imageY + imageHeight - 42);

  ctx.fillStyle = foreground;
  ctx.font = "700 30px Orbitron, Poppins, sans-serif";
  ctx.fillText("CAREER SNAPSHOT", 84, 932);
  ctx.fillStyle = accent;
  ctx.fillRect(84, 956, 184, 5);

  const gap = 20;
  const columns = 2;
  const cellWidth = (CARD_WIDTH - 168 - gap) / columns;
  const cellHeight = 170;
  card.stats.slice(0, 6).forEach((stat, index) => {
    const x = 84 + (index % columns) * (cellWidth + gap);
    const y = 1000 + Math.floor(index / columns) * (cellHeight + gap);
    roundedRect(ctx, x, y, cellWidth, cellHeight, 18);
    ctx.fillStyle = cardColor;
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted;
    ctx.font = "500 23px Poppins, sans-serif";
    ctx.fillText(fitText(ctx, stat.label.toUpperCase(), cellWidth - 48), x + 26, y + 48);
    ctx.fillStyle = foreground;
    ctx.font = "700 48px Orbitron, Poppins, sans-serif";
    ctx.fillText(fitText(ctx, String(stat.value), cellWidth - 48), x + 26, y + 118);
  });

  if (card.accentLabel) {
    ctx.fillStyle = primary;
    ctx.font = "600 27px Poppins, sans-serif";
    ctx.fillText(fitText(ctx, card.accentLabel, CARD_WIDTH - 168), 84, 1620);
  }
  ctx.fillStyle = muted;
  ctx.font = "500 22px Poppins, sans-serif";
  ctx.fillText(`${card.kind}  •  CRICKET STATS`, 84, 1780);

  const link = document.createElement("a");
  link.download = `${card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cricket-stats"}-stats.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
};