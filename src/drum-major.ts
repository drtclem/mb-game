export function conduct(canvas: HTMLCanvasElement, count: number) {
  const c = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = "#112332";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#314558";
  c.fillRect(35, 169, w - 70, 11);
  const line = (
    x: number,
    y: number,
    a: number,
    b: number,
    width: number,
    color: string,
  ) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(a, b);
    c.stroke();
  };
  line(73, 136, 70, 166, 10, "#f7f5ee");
  line(88, 136, 91, 166, 10, "#f7f5ee");
  c.fillStyle = "#f7f5ee";
  c.beginPath();
  c.moveTo(62, 78);
  c.lineTo(98, 78);
  c.lineTo(103, 139);
  c.lineTo(58, 139);
  c.closePath();
  c.fill();
  line(67, 86, 94, 129, 5, "#bfc9d1");
  c.fillStyle = "#bd9078";
  c.beginPath();
  c.ellipse(80, 63, 12, 16, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#faf9f1";
  c.fillRect(66, 39, 28, 14);
  c.fillRect(62, 52, 36, 4);
  c.beginPath();
  c.ellipse(80, 29, 6, 15, -0.2, 0, Math.PI * 2);
  c.fill();
  const phase = ((count % 4) + 4) % 4,
    index = Math.floor(phase),
    t = phase - index;
  const points = [
      [55, 133],
      [30, 103],
      [48, 79],
      [56, 55],
      [55, 133],
    ],
    a = points[index],
    b = points[index + 1],
    ease = t * t * (3 - 2 * t),
    x = a[0] + (b[0] - a[0]) * ease,
    y = a[1] + (b[1] - a[1]) * ease;
  line(64, 85, 45, 102, 9, "#f7f5ee");
  line(45, 102, x, y, 8, "#f7f5ee");
  line(96, 85, 114, 102, 9, "#f7f5ee");
  line(114, 102, w - x, y, 8, "#f7f5ee");
  for (const px of [x, w - x]) {
    c.fillStyle = "white";
    c.beginPath();
    c.ellipse(px, y, 5, 7, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#ebc487";
  c.font = "9px monospace";
  c.textAlign = "center";
  c.fillText("DRUM MAJOR", 80, 194);
}
