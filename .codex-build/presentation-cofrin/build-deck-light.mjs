import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/jpbra/Documents/GitHub/Cofrin";
const skillDir = "C:/Users/jpbra/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations";
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "assets");
const stageDir = path.join(workspaceDir, ".codex-finalizer");
const finalPath = path.join(workspaceDir, "output", "apresentacao-cofrin-com-mascote-v4.pptx");
const screenshots = Object.fromEntries(await Promise.all(
  ["login-current.png", "dashboard-current.png", "transactions-current.png", "social-current.png"].map(async (file) => [file, await fs.readFile(path.join(assets, file))]),
));
const mascotImage = await fs.readFile(path.join(workspaceDir, "frontend", "public", "brand", "cofrin-mascot.png"));

const W = 1280;
const H = 720;
const font = "Aptos";
const c = {
  paper: "#F6F8FC", white: "#FFFFFF", ink: "#10213F", text: "#253754", muted: "#65758F",
  blue: "#2864F0", bluePale: "#E8F0FF", blueSoft: "#CFE0FF", green: "#0E9F6E",
  greenPale: "#DDF7EC", red: "#D92D35", redPale: "#FCE7E8", line: "#D8E1F0", navy: "#10213F",
};
const deck = Presentation.create({ slideSize: { width: W, height: H } });

function shape(slide, geometry, position, fill = "none", line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({ geometry, position, fill, line });
}
function text(slide, value, position, style = {}) {
  const node = slide.shapes.add({ geometry: "textbox", position, fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  node.text = value;
  node.text.style = { fontFamily: font, fontSize: 18, color: c.ink, ...style };
  node.text.insets = 0;
  return node;
}
function fullScreenshot(slide, file, x, y, w, h, alt) {
  shape(slide, "roundRect", { left: x - 7, top: y - 7, width: w + 14, height: h + 14 }, c.white, { style: "solid", fill: c.line, width: 1 });
  slide.images.add({ blob: screenshots[file], contentType: "image/png", alt, fit: "contain", position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: "rounded-xl" });
}
function mascot(slide, x, y, w, h, alt = "Mascote Cofrin") {
  slide.images.add({ blob: mascotImage, contentType: "image/png", alt, fit: "contain", position: { left: x, top: y, width: w, height: h } });
}
function page(slide, number, label) {
  slide.background.fill = c.paper;
  text(slide, String(number).padStart(2, "0"), { left: 74, top: 48, width: 54, height: 24 }, { fontSize: 15, bold: true, color: c.blue });
  text(slide, label, { left: 140, top: 48, width: 360, height: 24 }, { fontSize: 15, bold: true, color: c.muted });
}
function rule(slide, x, y, w, color = c.blue, h = 5) { shape(slide, "rect", { left: x, top: y, width: w, height: h }, color); }

// 1. Cover
{
  const s = deck.slides.add(); s.background.fill = c.paper;
  shape(s, "rect", { left: 0, top: 0, width: 432, height: H }, c.blue);
  text(s, "COFRIN", { left: 510, top: 156, width: 560, height: 78 }, { fontSize: 66, bold: true, color: c.ink });
  mascot(s, 1090, 150, 74, 74, "Ícone do mascote Cofrin");
  text(s, "Gestão financeira pessoal\ncom colaboração para objetivos compartilhados", { left: 510, top: 266, width: 640, height: 102 }, { fontSize: 31, color: c.text });
  rule(s, 510, 426, 430, c.green);
  text(s, "Apresentação do projeto", { left: 510, top: 466, width: 300, height: 30 }, { fontSize: 20, bold: true, color: c.ink });
  text(s, "10 slides em quatro partes", { left: 510, top: 507, width: 280, height: 26 }, { fontSize: 17, color: c.muted });
  text(s, "financeiro pessoal", { left: 116, top: 554, width: 220, height: 28 }, { fontSize: 18, color: c.white });
  text(s, "colaboração opcional", { left: 116, top: 588, width: 230, height: 28 }, { fontSize: 18, color: c.white });
}

// 2. Agenda
{
  const s = deck.slides.add(); s.background.fill = c.blue;
  text(s, "COFRIN", { left: 74, top: 57, width: 170, height: 24 }, { fontSize: 14, bold: true, color: c.white });
  text(s, "O que será mostrado", { left: 74, top: 122, width: 780, height: 64 }, { fontSize: 52, bold: true, color: c.white });
  const parts = [
    ["01", "Contexto", "O problema que o app organiza"],
    ["02", "Aplicação", "Login, painel e lançamentos"],
    ["03", "Social", "Pessoas, grupos e conversas"],
    ["04", "Finalidade", "Como a colaboração é utilizada"],
  ];
  parts.forEach(([n, h, d], i) => {
    const x = 74 + (i % 2) * 570;
    const y = i < 2 ? 270 : 462;
    text(s, n, { left: x, top: y, width: 60, height: 26 }, { fontSize: 16, bold: true, color: c.greenPale });
    text(s, h, { left: x, top: y + 42, width: 390, height: 38 }, { fontSize: 30, bold: true, color: c.white });
    text(s, d, { left: x, top: y + 90, width: 410, height: 28 }, { fontSize: 18, color: c.bluePale });
  });
}

// 3. Context
{
  const s = deck.slides.add(); page(s, 3, "CONTEXTO");
  text(s, "Organizar o mês\npara enxergar melhor", { left: 74, top: 128, width: 700, height: 132 }, { fontSize: 53, bold: true });
  text(s, "O Cofrin concentra registros, saldo, despesas e metas. A pessoa encontra a leitura do período sem separar a rotina em várias ferramentas.", { left: 78, top: 318, width: 650, height: 98 }, { fontSize: 24, color: c.text });
  shape(s, "rect", { left: 840, top: 108, width: 320, height: 430 }, c.bluePale);
  text(s, "01", { left: 889, top: 161, width: 240, height: 100 }, { fontSize: 86, bold: true, color: c.blue, align: "center" });
  text(s, "Registros\nLeitura do mês\nObjetivos", { left: 910, top: 320, width: 200, height: 110 }, { fontSize: 25, bold: true, color: c.ink, align: "center" });
  text(s, "O uso começa individualmente.", { left: 78, top: 557, width: 450, height: 28 }, { fontSize: 20, bold: true, color: c.green });
}

// 4. Login
{
  const s = deck.slides.add(); page(s, 4, "APLICAÇÃO");
  text(s, "Acesso sem distração", { left: 74, top: 118, width: 690, height: 60 }, { fontSize: 47, bold: true });
  text(s, "A tela de login tem uma função clara: levar cada pessoa ao seu ambiente financeiro.", { left: 78, top: 190, width: 760, height: 32 }, { fontSize: 20, color: c.muted });
  fullScreenshot(s, "login-current.png", 74, 256, 854, 440, "Tela atual de login do Cofrin com o novo ícone");
  shape(s, "rect", { left: 982, top: 256, width: 222, height: 440 }, c.blue);
  text(s, "Entrar", { left: 1020, top: 318, width: 150, height: 44 }, { fontSize: 31, bold: true, color: c.white });
  text(s, "As credenciais identificam o usuário antes do carregamento dos dados ligados à conta.", { left: 1020, top: 392, width: 147, height: 136 }, { fontSize: 20, color: c.white });
}

// 5. Dashboard
{
  const s = deck.slides.add(); page(s, 5, "APLICAÇÃO");
  text(s, "Visão geral do mês", { left: 74, top: 118, width: 690, height: 60 }, { fontSize: 47, bold: true });
  text(s, "O painel reúne os números que orientam a leitura do período antes de um novo lançamento.", { left: 78, top: 190, width: 760, height: 32 }, { fontSize: 20, color: c.muted });
  fullScreenshot(s, "dashboard-current.png", 222, 240, 836, 470, "Dashboard atual do Cofrin com o novo ícone");
}

// 6. Transactions
{
  const s = deck.slides.add(); page(s, 6, "APLICAÇÃO");
  text(s, "Lançamentos que explicam os números", { left: 74, top: 118, width: 950, height: 60 }, { fontSize: 47, bold: true });
  text(s, "Cada entrada e saída ganha descrição, categoria, data e status para construir um histórico consultável.", { left: 78, top: 190, width: 900, height: 32 }, { fontSize: 20, color: c.muted });
  fullScreenshot(s, "transactions-current.png", 74, 245, 800, 450, "Tela atual de lançamentos do Cofrin com o novo ícone");
  text(s, "Receitas", { left: 1052, top: 315, width: 140, height: 32 }, { fontSize: 25, bold: true, color: c.green });
  text(s, "Entradas com valor e status.", { left: 1052, top: 357, width: 140, height: 54 }, { fontSize: 17, color: c.text });
  text(s, "Despesas", { left: 1052, top: 470, width: 140, height: 32 }, { fontSize: 25, bold: true, color: c.red });
  text(s, "Saídas classificadas para leitura do mês.", { left: 1052, top: 512, width: 145, height: 54 }, { fontSize: 17, color: c.text });
}

// 7. Social
{
  const s = deck.slides.add(); page(s, 7, "SOCIAL");
  text(s, "A área Social", { left: 74, top: 118, width: 540, height: 60 }, { fontSize: 47, bold: true });
  text(s, "Um espaço para conectar pessoas que participam de objetivos compartilhados.", { left: 78, top: 190, width: 790, height: 32 }, { fontSize: 20, color: c.muted });
  fullScreenshot(s, "social-current.png", 74, 256, 854, 440, "Tela Social atual do Cofrin com o novo ícone");
  shape(s, "rect", { left: 982, top: 256, width: 222, height: 440 }, c.greenPale);
  text(s, "Pessoas", { left: 1014, top: 306, width: 170, height: 32 }, { fontSize: 25, bold: true, color: c.ink });
  text(s, "Perfis e amizades", { left: 1014, top: 348, width: 170, height: 28 }, { fontSize: 17, color: c.text });
  text(s, "Grupos", { left: 1014, top: 424, width: 170, height: 32 }, { fontSize: 25, bold: true, color: c.ink });
  text(s, "Planejamento em conjunto", { left: 1014, top: 466, width: 170, height: 48 }, { fontSize: 17, color: c.text });
  text(s, "Conversas", { left: 1014, top: 554, width: 170, height: 32 }, { fontSize: 25, bold: true, color: c.ink });
  text(s, "Mensagens no contexto do grupo", { left: 1014, top: 596, width: 170, height: 48 }, { fontSize: 17, color: c.text });
}

// 8. Social purpose
{
  const s = deck.slides.add(); s.background.fill = c.navy;
  text(s, "03  SOCIAL", { left: 74, top: 53, width: 220, height: 22 }, { fontSize: 15, bold: true, color: c.green });
  text(s, "Para que serve o Social?", { left: 74, top: 124, width: 900, height: 66 }, { fontSize: 53, bold: true, color: c.white });
  text(s, "Ele ajuda pessoas a se organizarem em torno de uma mesma meta, sem transformar o controle financeiro pessoal em algo público.", { left: 78, top: 212, width: 830, height: 68 }, { fontSize: 24, color: c.bluePale });
  text(s, "GRUPO", { left: 74, top: 388, width: 250, height: 31 }, { fontSize: 23, bold: true, color: c.green });
  text(s, "Reúne os participantes de uma viagem, casa ou outro objetivo comum.", { left: 74, top: 434, width: 300, height: 86 }, { fontSize: 21, color: c.white });
  text(s, "CONTEXTO", { left: 470, top: 388, width: 250, height: 31 }, { fontSize: 23, bold: true, color: c.blueSoft });
  text(s, "Mantém as conversas relacionadas ao planejamento do grupo.", { left: 470, top: 434, width: 300, height: 86 }, { fontSize: 21, color: c.white });
  text(s, "PRIVACIDADE", { left: 866, top: 388, width: 300, height: 31 }, { fontSize: 23, bold: true, color: c.green });
  text(s, "Preserva os registros e a leitura financeira de cada usuário.", { left: 866, top: 434, width: 300, height: 86 }, { fontSize: 21, color: c.white });
}

// 9. Boundaries
{
  const s = deck.slides.add(); page(s, 9, "FINALIDADE");
  text(s, "O que continua individual\ne o que pode ser compartilhado", { left: 74, top: 114, width: 1050, height: 122 }, { fontSize: 49, bold: true });
  shape(s, "rect", { left: 74, top: 324, width: 500, height: 236 }, c.bluePale);
  shape(s, "rect", { left: 630, top: 324, width: 500, height: 236 }, c.greenPale);
  text(s, "Individual", { left: 112, top: 364, width: 260, height: 42 }, { fontSize: 31, bold: true, color: c.ink });
  text(s, "Registros pessoais\nSaldo e leitura do mês\nMetas próprias", { left: 112, top: 431, width: 300, height: 92 }, { fontSize: 21, color: c.text });
  text(s, "Compartilhado", { left: 668, top: 364, width: 300, height: 42 }, { fontSize: 31, bold: true, color: c.ink });
  text(s, "Grupos de planejamento\nParticipantes do objetivo\nConversas relacionadas", { left: 668, top: 431, width: 360, height: 92 }, { fontSize: 21, color: c.text });
  text(s, "A área Social é uma extensão do planejamento quando há mais de uma pessoa envolvida.", { left: 76, top: 628, width: 870, height: 30 }, { fontSize: 19, color: c.muted });
}

// 10. Closing
{
  const s = deck.slides.add(); s.background.fill = c.paper;
  shape(s, "rect", { left: 0, top: 0, width: W, height: 216 }, c.blue);
  text(s, "Cofrin", { left: 74, top: 70, width: 410, height: 64 }, { fontSize: 56, bold: true, color: c.white });
  mascot(s, 1112, 72, 64, 64, "Ícone do mascote Cofrin");
  text(s, "Financeiro pessoal com visão, contexto e colaboração quando necessária.", { left: 76, top: 270, width: 920, height: 52 }, { fontSize: 33, color: c.ink });
  rule(s, 76, 382, 590, c.green);
  text(s, "Controle individual", { left: 76, top: 432, width: 260, height: 30 }, { fontSize: 21, bold: true, color: c.ink });
  text(s, "Planejamento compartilhado", { left: 447, top: 432, width: 345, height: 30 }, { fontSize: 21, bold: true, color: c.ink });
  text(s, "Obrigado", { left: 76, top: 600, width: 160, height: 30 }, { fontSize: 21, color: c.green });
}

for (const [i, slide] of deck.slides.items.entries()) {
  slide.speakerNotes.text = `Cofrin — slide ${i + 1}. Capturas de tela geradas no ambiente local do projeto em 14/10/2026.`;
}

await fs.mkdir(stageDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const candidatePath = path.join(stageDir, "apresentacao-cofrin-com-mascote-v4-candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: "C:/Users/jpbra/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stageDir, "apresentacao-cofrin-com-mascote-v4.validation.json"),
});

